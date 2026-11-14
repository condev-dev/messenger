-- Push subscriptions for Web Push (VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push subs own read" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy "push subs own insert" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy "push subs own delete" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

create index on public.push_subscriptions (user_id);