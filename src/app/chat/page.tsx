"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useChats } from "@/features/chat/hooks/useChats";
import { ChatList } from "@/features/chat/components/ChatList";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { NewChatDialog } from "@/features/chat/components/NewChatDialog";
import { AppShell } from "@/features/chat/components/AppShell";
import { usePresenceHeartbeat } from "@/features/chat/hooks/usePresenceHeartbeat";
import { useDesktopNotifications } from "@/features/chat/hooks/useDesktopNotifications";
import type { Profile } from "@/features/chat/types";

export default function ChatPage() {
  const r = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        r.replace("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!p) {
        // پروفایل هنوز ساخته نشده — احتمالاً تریگر اجرا نشده
        r.replace("/login");
        return;
      }
      setMe(p as Profile);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [r]);

  if (checking || !me) {
    return (
      <div className="h-dvh grid place-items-center bg-app-bg">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          در حال بارگذاری…
        </div>
      </div>
    );
  }

  return <Inner me={me} />;
}

function Inner({ me }: { me: Profile }) {
  const { chats, reload } = useChats(me.id);
  const [active, setActive] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // به‌روزرسانی دوره‌ای last_seen_at
  usePresenceHeartbeat(true);

  // نقشه‌ی id → نام طرف مقابل، برای نوتیفیکیشن
  const senderNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of chats) {
      if (c.other) {
        const n = c.other.display_name ?? c.other.username ?? "کاربر";
        map.set(c.other.id, n);
      }
    }
    return map;
  }, [chats]);

  const getPeerName = useCallback(
    (senderId: string) => senderNames.get(senderId) ?? "پیام جدید",
    [senderNames]
  );

  // نوتیفیکیشن دسکتاپ
  useDesktopNotifications(me.id, getPeerName);

  const activeChat = chats.find((c) => c.id === active);
  const title =
    activeChat?.title ??
    activeChat?.other?.display_name ??
    activeChat?.other?.username ??
    "";

  const handleCreated = useCallback(
    async (chatId: string) => {
      await reload();
      setActive(chatId);
    },
    [reload]
  );

  return (
    <>
      <AppShell
        me={me}
        hasActive={!!active}
        onBack={() => setActive(null)}
        onCompose={() => setComposeOpen(true)}
        sidebar={
          <ChatList
            chats={chats}
            activeId={active}
            onSelect={setActive}
          />
        }
        main={
          active ? (
            <ChatWindow
              key={active}
              chatId={active}
              userId={me.id}
              title={title}
              other={activeChat?.other}
            />
          ) : null
        }
      />
      <NewChatDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
