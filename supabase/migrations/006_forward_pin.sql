-- 006_forward_pin.sql — پشتیبانی از forward و pin message
-- این migration غیرمخرب است: فقط ستون‌های اختیاری اضافه می‌کند.

-- ====== Forward ======
-- forwarded_from_message_id: شناسه‌ی پیام اصلی (در هر چت)
-- forwarded_from_user_id:    فرستنده‌ی اصلی (برای نمایش «ارسال‌شده از X»)
alter table public.messages
  add column if not exists forwarded_from_message_id uuid,
  add column if not exists forwarded_from_user_id uuid references public.profiles(id);

-- ====== Pin ======
-- pinned_at نال = پین نیست. هر چت ممکن است چند پیام پین داشته باشد (مثل تلگرام).
alter table public.messages
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles(id);

-- ایندکس برای گرفتن سریع پین‌های یک چت (آخرین پین اول)
create index if not exists messages_chat_pinned_idx
  on public.messages (chat_id, pinned_at desc)
  where pinned_at is not null and deleted_at is null;

-- پیام‌های پین‌شده، فقط برای اعضای چت
-- (سیاست SELECT قبلی روی اعضا کافی است؛ ستون جدید همان اعتبارسنجی را به ارث می‌برد.)

-- ====== RPC: toggle_pin ======
-- فقط عضو چت می‌تواند پین/آن‌پین کند.
create or replace function public.toggle_pin(p_message uuid)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  m record;
  new_pinned_at timestamptz;
begin
  select id, chat_id, pinned_at into m
  from public.messages
  where id = p_message and deleted_at is null;

  if not found then
    raise exception 'message not found';
  end if;

  if not public.is_chat_member(m.chat_id) then
    raise exception 'not a member';
  end if;

  if m.pinned_at is null then
    new_pinned_at := now();
    update public.messages
      set pinned_at = new_pinned_at, pinned_by = auth.uid()
      where id = p_message;
  else
    new_pinned_at := null;
    update public.messages
      set pinned_at = null, pinned_by = null
      where id = p_message;
  end if;

  return new_pinned_at;
end $$;

grant execute on function public.toggle_pin(uuid) to authenticated;

-- ====== نکته ======
-- forward از سمت کلاینت با یک INSERT ساده انجام می‌شود (کپی content + تنظیم forwarded_from_*).
-- RLS فعلی insert_by_member کفایت می‌کند چون هر عضو می‌تواند در چت خودش پیام بفرستد.
