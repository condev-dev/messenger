-- =====================================================
-- Migration 003 — RPCهای عملکردی برای فاز ۲.۵
-- بی‌خطر برای اجرای مجدد (idempotent)
-- =====================================================

-- ---------- ۱) لیست خلاصه‌ی چت‌ها با preview و unread واقعی ----------
-- یک RPC که همه‌ی اطلاعاتی که برای ChatList نیاز داریم را یکجا برمی‌گرداند
create or replace function public.list_chat_summaries()
returns table (
  id uuid,
  type text,
  title text,
  last_message_at timestamptz,
  other_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  other_last_seen_at timestamptz,
  last_sender_id uuid,
  last_type text,
  last_content jsonb,
  last_deleted_at timestamptz,
  last_created_at timestamptz,
  unread_count int
)
language sql
security definer
set search_path = public
stable
as $$
  with my_chats as (
    select c.id, c.type, c.title, c.last_message_at, cm.last_read_at
    from public.chats c
    join public.chat_members cm on cm.chat_id = c.id
    where cm.user_id = auth.uid()
  ),
  last_msg as (
    select distinct on (m.chat_id)
      m.chat_id, m.sender_id, m.type, m.content, m.deleted_at, m.created_at
    from public.messages m
    where m.chat_id in (select id from my_chats)
    order by m.chat_id, m.created_at desc
  ),
  other_user as (
    select cm.chat_id, p.id, p.username, p.display_name, p.avatar_url, p.last_seen_at
    from public.chat_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.chat_id in (select id from my_chats)
      and cm.user_id <> auth.uid()
  ),
  unread as (
    select m.chat_id, count(*)::int as c
    from public.messages m
    join my_chats mc on mc.id = m.chat_id
    where m.created_at > coalesce(mc.last_read_at, 'epoch'::timestamptz)
      and m.sender_id <> auth.uid()
      and m.deleted_at is null
    group by m.chat_id
  )
  select
    mc.id,
    mc.type,
    mc.title,
    mc.last_message_at,
    ou.id as other_id,
    ou.username as other_username,
    ou.display_name as other_display_name,
    ou.avatar_url as other_avatar_url,
    ou.last_seen_at as other_last_seen_at,
    lm.sender_id as last_sender_id,
    lm.type as last_type,
    lm.content as last_content,
    lm.deleted_at as last_deleted_at,
    lm.created_at as last_created_at,
    coalesce(u.c, 0) as unread_count
  from my_chats mc
  left join last_msg lm on lm.chat_id = mc.id
  left join other_user ou on ou.chat_id = mc.id
  left join unread u on u.chat_id = mc.id
  order by mc.last_message_at desc nulls last;
$$;

-- ---------- ۲) ایندکس برای بهبود پرس‌وجوهای بالا ----------
create index if not exists idx_messages_chat_created_desc
  on public.messages (chat_id, created_at desc);

-- پایان
