"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatItem, Profile, MessageContent } from "../types";

type SummaryRow = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  last_message_at: string;
  other_id: string | null;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  other_last_seen_at: string | null;
  last_sender_id: string | null;
  last_type: string | null;
  last_content: MessageContent | null;
  last_deleted_at: string | null;
  last_created_at: string | null;
  unread_count: number;
};

function previewOf(type: string | null, content: MessageContent | null, deleted: boolean): string {
  if (deleted) return "پیام حذف‌شده";
  if (!type) return "";
  switch (type) {
    case "text":
      return (content?.text as string | undefined)?.slice(0, 80) ?? "";
    case "image":
      return "🖼 عکس";
    case "gif":
      return "🎞 گیف";
    case "file":
      return "📎 فایل";
    case "sticker":
      return "استیکر";
    case "voice":
      return "🎤 پیام صوتی";
    default:
      return "پیام";
  }
}

function toChatItem(r: SummaryRow): ChatItem {
  const other: Profile | undefined = r.other_id
    ? {
        id: r.other_id,
        username: r.other_username ?? "",
        display_name: r.other_display_name,
        avatar_url: r.other_avatar_url,
        last_seen_at: r.other_last_seen_at,
      }
    : undefined;
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    last_message_at: r.last_message_at,
    other,
    preview: previewOf(r.last_type, r.last_content, !!r.last_deleted_at),
    unread: r.unread_count ?? 0,
  };
}

/* ---------- Fallback برای وقتی migration 003 اجرا نشده ---------- */

type ChatRowFallback = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  last_message_at: string;
  chat_members: { user_id: string; profiles: Profile | null }[];
};

async function fetchChatsFallback(userId: string): Promise<ChatItem[]> {
  const { data } = await supabase
    .from("chats")
    .select(
      "id,type,title,last_message_at, chat_members(user_id, profiles(id,username,display_name,avatar_url,bio,last_seen_at))"
    )
    .order("last_message_at", { ascending: false });

  return ((data ?? []) as unknown as ChatRowFallback[]).map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    last_message_at: c.last_message_at,
    other: c.chat_members
      .map((m) => m.profiles)
      .find((p): p is Profile => !!p && p.id !== userId),
    preview: "",
    unread: 0,
  }));
}

async function fetchChats(userId: string): Promise<ChatItem[]> {
  const { data, error } = await supabase.rpc("list_chat_summaries");
  if (error || !data) {
    // migration 003 هنوز اجرا نشده → fallback
    return fetchChatsFallback(userId);
  }
  return (data as SummaryRow[]).map(toChatItem);
}

export function useChats(userId: string) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  // debounce برای INSERT/UPDATE های پشت‌سرهم
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setChats(await fetchChats(userId));
  }, [userId]);

  const scheduleLoad = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void load();
    }, 250);
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    void fetchChats(userId).then((rows) => {
      if (!cancelled) setChats(rows);
    });

    // گوش دادن به تغییرات messages و chat_members تا لیست چت‌ها بروز بماند
    const ch = supabase
      .channel("chats-refresh")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        scheduleLoad
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        scheduleLoad
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_members" },
        scheduleLoad
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [userId, scheduleLoad]);

  return { chats, reload: load };
}
