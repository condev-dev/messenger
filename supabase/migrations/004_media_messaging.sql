-- =====================================================
-- Migration 004 — پیام‌های رسانه‌ای (عکس / فایل)
-- باکت عمومی media در migration 002 ساخته شده است؛
-- این فایل فقط safeguardهای متادیتا، محدودیت‌ها و policyهای storage را کامل می‌کند.
-- ساختار مسیر فایل: <chat_id>/<user_id>/<uuid>-<safe-name>
-- بی‌خطر برای اجرای مجدد (idempotent)
-- =====================================================

-- ---------- ۱) اطمینان از وجود باکت media و عمومی بودن آن ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- سقف حجم در سطح باکت: ۲۵ مگابایت (هم‌راستا با MAX_FILE_BYTES در کلاینت)
-- allowed_mime_types عمداً NULL می‌ماند تا ارسال فایل عمومی (pdf/zip/docx/…) ممکن باشد؛
-- اعتبارسنجی نوع فایل در کلاینت (allowlist تصویر + blocklist فایل خطرناک) و
-- در تریگر messages انجام می‌شود.
update storage.buckets
set file_size_limit = 26214400
where id = 'media';

-- ---------- ۲) helper امن برای تبدیل متن به uuid ----------
-- در policyها نمی‌توان مستقیم روی مقدار دلخواه ::uuid زد (خطای runtime)؛
-- این تابع در صورت نامعتبر بودن NULL برمی‌گرداند.
create or replace function public.safe_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  if p is null or p !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return p::uuid;
exception
  when others then
    return null;
end;
$$;

-- ---------- ۳) helper عضویت در چت (برای policyهای storage) ----------
-- نکته: نام پارامتر عمداً «cid» است تا با امضای موجود در migration اولیه
-- (public.is_chat_member(cid uuid)) سازگار بماند. تغییر نام پارامتر در
-- create or replace مجاز نیست و خطای 42P13 می‌دهد.
create or replace function public.is_chat_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_members cm
    where cm.chat_id = cid
      and cm.user_id = auth.uid()
  );
$$;

grant execute on function public.safe_uuid(text) to authenticated;
grant execute on function public.is_chat_member(uuid) to authenticated;

-- ---------- ۴) Policyهای باکت media ----------
-- خواندن عمومی (باکت public است، ولی policy صریح هم لازم است)
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select
  using (bucket_id = 'media');

-- آپلود: فقط اعضای همان چت، فقط داخل پوشه‌ی خودشان
-- name = <chat_id>/<user_id>/<uuid>-<safe-name>  → foldername = {chat_id, user_id}
drop policy if exists "media member insert own" on storage.objects;
create policy "media member insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_chat_member(public.safe_uuid((storage.foldername(name))[1]))
  );

-- جایگزینی فایل (upsert) فقط توسط صاحب پوشه و عضو چت
drop policy if exists "media member update own" on storage.objects;
create policy "media member update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_chat_member(public.safe_uuid((storage.foldername(name))[1]))
  );

-- حذف فقط فایل خود کاربر
drop policy if exists "media member delete own" on storage.objects;
create policy "media member delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------- ۵) safeguard متادیتای پیام رسانه‌ای ----------
-- قواعد:
--   * type باید یکی از مقادیر مجاز باشد
--   * image/file باید url معتبر (http/https) داشته باشند
--   * image باید mime_type با prefix تصویر داشته باشد (svg مجاز نیست)
--   * size باید عددی مثبت و حداکثر ۲۵ مگابایت باشد
--   * اگر path داده شده، باید با «<chat_id>/<sender_id>/» شروع شود
create or replace function public.validate_message_media()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kind text := lower(coalesce(new.type, ''));
  v_url text := coalesce(new.content ->> 'url', '');
  v_mime text := lower(coalesce(new.content ->> 'mime_type', ''));
  v_path text := coalesce(new.content ->> 'path', '');
  v_size numeric := nullif(new.content ->> 'size', '')::numeric;
  v_prefix text;
begin
  if v_kind not in ('text', 'image', 'file', 'gif', 'voice', 'video', 'sticker') then
    raise exception 'نوع پیام مجاز نیست: %', new.type
      using errcode = '23514';
  end if;

  -- فقط پیام‌های رسانه‌ای بررسی می‌شوند (soft-delete که content را خالی می‌کند مجاز است)
  if v_kind not in ('image', 'file', 'gif', 'voice', 'video', 'sticker') then
    return new;
  end if;

  if new.deleted_at is not null then
    return new;
  end if;

  if v_url = '' or v_url !~* '^https?://' then
    raise exception 'پیام رسانه‌ای بدون url معتبر مجاز نیست'
      using errcode = '23514';
  end if;

  if v_size is not null and (v_size <= 0 or v_size > 26214400) then
    raise exception 'حجم رسانه باید بین ۱ بایت و ۲۵ مگابایت باشد'
      using errcode = '23514';
  end if;

  if v_kind in ('image', 'gif') then
    if v_mime = '' or v_mime !~ '^image/' or v_mime = 'image/svg+xml' then
      raise exception 'نوع فایل تصویر مجاز نیست: %', v_mime
        using errcode = '23514';
    end if;
  end if;

  -- جلوگیری از ارجاع به مسیر چت/کاربر دیگر
  if v_path <> '' then
    v_prefix := new.chat_id::text || '/' || new.sender_id::text || '/';
    if left(v_path, length(v_prefix)) <> v_prefix then
      raise exception 'مسیر رسانه با چت یا فرستنده هم‌خوانی ندارد'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_message_media on public.messages;
create trigger trg_validate_message_media
  before insert or update of type, content, deleted_at on public.messages
  for each row execute function public.validate_message_media();

-- ---------- ۶) محدودیت نوع پیام در سطح جدول ----------
-- not valid: رکوردهای قدیمی بررسی نمی‌شوند، رکوردهای جدید کنترل می‌شوند.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_type_allowed' and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_type_allowed
      check (type in ('text', 'image', 'file', 'gif', 'voice', 'video', 'sticker'))
      not valid;
  end if;
end $$;

-- ---------- ۷) ایندکس کمکی برای فیلتر پیام‌های رسانه‌ای ----------
create index if not exists idx_messages_chat_type_created
  on public.messages (chat_id, type, created_at desc);

-- پایان
-- نکته: این مهاجرت به‌صورت خودکار روی پروژه‌ی Supabase اجرا نشده است؛
-- باید در SQL Editor (یا با supabase db push) اجرا شود.
