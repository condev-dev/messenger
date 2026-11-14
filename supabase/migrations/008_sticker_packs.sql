-- =====================================================
-- Migration 008 — Sticker Packs (قابل آپلود)
-- =====================================================

-- ---------- ۱) جدول پک‌های استیکر ----------
create table if not exists public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ۲) جدول استیکرهای داخل پک ----------
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  url text not null,
  emoji text,
  created_at timestamptz not null default now()
);

-- ---------- ۳) RLS ----------
alter table public.sticker_packs enable row level security;
alter table public.stickers enable row level security;

-- همه می‌توانند پک‌های public را ببینند
create policy "public packs readable" on public.sticker_packs
  for select using (is_public = true or owner_id = auth.uid());

-- فقط صاحب پک می‌تواند ویرایش/حذف کند
create policy "owner manages pack" on public.sticker_packs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- استیکرهای پک‌های public یا متعلق به خود قابل مشاهده
create policy "stickers readable" on public.stickers
  for select using (
    exists (
      select 1 from public.sticker_packs p
      where p.id = stickers.pack_id
        and (p.is_public = true or p.owner_id = auth.uid())
    )
  );

-- فقط صاحب پک می‌تواند استیکر اضافه/حذف کند
create policy "owner manages stickers" on public.stickers
  for all using (
    exists (
      select 1 from public.sticker_packs p
      where p.id = stickers.pack_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sticker_packs p
      where p.id = stickers.pack_id and p.owner_id = auth.uid()
    )
  );

-- ---------- ۴) Storage bucket ----------
insert into storage.buckets (id, name, public)
values ('stickers', 'stickers', true)
on conflict (id) do nothing;

-- policy: هر کسی می‌تواند بخواند (public)
create policy "stickers public read" on storage.objects
  for select using (bucket_id = 'stickers');

-- policy: فقط صاحب می‌تواند آپلود کند
create policy "stickers owner upload" on storage.objects
  for insert with check (
    bucket_id = 'stickers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- policy: فقط صاحب می‌تواند حذف کند
create policy "stickers owner delete" on storage.objects
  for delete using (
    bucket_id = 'stickers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );