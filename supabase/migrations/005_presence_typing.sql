-- =====================================================
-- Migration 005 — Presence/Typing + ارتقای زیرساخت زنده
-- بی‌خطر برای اجرای مجدد (idempotent)
-- =====================================================
--
-- این migration چیزهای زیر رو اضافه می‌کنه:
--  ۱) اطمینان از وجود ستون last_seen_at (idempotent)
--  ۲) تابع touch_last_seen (idempotent)
--  ۳) ایندکس روی last_seen_at
--  ۴) اضافه کردن chat_members و chats به publication supabase_realtime
--     تا UPDATE روی last_read_at و last_message_at به کلاینت برسد
--  ۵) replica identity full برای همان دو جدول

-- ---------- ۱) اطمینان از وجود ستون last_seen_at ----------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'last_seen_at'
  ) then
    alter table public.profiles add column last_seen_at timestamptz;
  end if;
end $$;

-- ---------- ۲) تابع touch_last_seen (idempotent) ----------
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

grant execute on function public.touch_last_seen() to authenticated;

-- ---------- ۳) ایندکس last_seen_at ----------
create index if not exists idx_profiles_last_seen on public.profiles (last_seen_at desc);

-- ---------- ۴) افزودن chat_members و chats به publication Realtime ----------
-- نکته: بدون این، UPDATE‌های last_read_at و last_message_at به کلاینت نمی‌رسند
-- و در نتیجه در تب دیگر کاربر لیست چت‌ها/تیک آبی به‌روز نمی‌شوند.
do $$
begin
  perform 1 from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'chat_members';
  if not found then
    execute 'alter publication supabase_realtime add table public.chat_members';
  end if;

  perform 1 from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'chats';
  if not found then
    execute 'alter publication supabase_realtime add table public.chats';
  end if;
end $$;

-- ---------- ۵) replica identity full برای UPDATE/DELETE کامل ----------
alter table public.chat_members replica identity full;
alter table public.chats replica identity full;

-- پایان
-- Typing Indicator از طریق Supabase Realtime Broadcast پیاده می‌شود
-- (کانال `typing:<chat_id>` با event="typing") و نیازی به جدول یا تابع دیتابیسی ندارد.

