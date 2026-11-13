-- =====================================================
-- Migration 002 — فاز ۱ (حساب کاربری) + فاز ۲ (ادیت/حذف/ریپلای)
-- اجرا توی Supabase SQL Editor کامل paste و Run کن
-- بی‌خطر برای اجرای مجدد (idempotent) تا جای ممکن
-- =====================================================

-- ---------- ۱) ستون‌های جدید در profiles ----------
alter table public.profiles
  add column if not exists bio text,
  add column if not exists last_seen_at timestamptz;

-- ---------- ۲) ستون last_read_at روی chat_members ----------
-- (توی مهاجرت اول اضافه شده بود؛ محض اطمینان)
alter table public.chat_members
  add column if not exists last_read_at timestamptz default now();

-- ---------- ۳) RLS: ویرایش/حذف پیام توسط فرستنده ----------
drop policy if exists "messages update by sender" on public.messages;
create policy "messages update by sender" on public.messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- (soft-delete از طریق UPDATE deleted_at انجام می‌شود، DELETE واقعی بسته است)

-- ---------- ۴) RPC: علامت خواندن ----------
create or replace function public.mark_chat_read(chat uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_members
  set last_read_at = now()
  where chat_id = chat and user_id = auth.uid();
$$;

-- ---------- ۵) RPC: به‌روز کردن last_seen کاربر فعلی ----------
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
$$;

-- ---------- ۶) Storage bucket برای آواتار و media ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Policy آواتار: هر کاربر فقط فایل‌های پوشه‌ی uid خودش را می‌تواند آپلود/تغییر/حذف کند
-- ساختار path: <uid>/avatar.<ext>
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars user insert own" on storage.objects;
create policy "avatars user insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars user update own" on storage.objects;
create policy "avatars user update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars user delete own" on storage.objects;
create policy "avatars user delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- ۷) Realtime برای UPDATE/DELETE روی messages ----------
-- جدول قبلاً اضافه شده؛ مطمئن می‌شویم همه‌ی event ها فعال‌اند
do $$
begin
  perform 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages';
  if not found then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- برای اینکه در UPDATE/DELETE رکورد قدیمی هم به کلاینت برسد:
alter table public.messages replica identity full;

-- ---------- ۸) فیلتر پیام‌های حذف‌شده در RLS select (اختیاری) ----------
-- پیام‌های soft-delete برای همه قابل خواندن می‌مانند ولی UI «این پیام حذف شد» نشان می‌دهد.

-- پایان
