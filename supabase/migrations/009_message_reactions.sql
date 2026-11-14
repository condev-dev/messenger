-- =====================================================
-- Migration 009 — Message Reactions
-- =====================================================

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create policy "reactions readable" on public.message_reactions
  for select using (true);

create policy "user manages own reaction" on public.message_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime
do $$
begin
  perform 1 from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'message_reactions';
  if not found then
    execute 'alter publication supabase_realtime add table public.message_reactions';
  end if;
end $$;
alter table public.message_reactions replica identity full;