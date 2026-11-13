"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Message, MessageContent } from "../types";

const PAGE_SIZE = 50;

async function fetchPage(
  chatId: string,
  before?: string
): Promise<{ rows: Message[]; hasMore: boolean }> {
  let q = supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  const rows = ((data ?? []) as Message[]).reverse();
  return { rows, hasMore: (data ?? []).length === PAGE_SIZE };
}

/** last_read_at همه‌ی اعضای یک چت (به جز خودم) */
async function fetchPeersLastRead(
  chatId: string,
  myId: string
): Promise<Record<string, string | null>> {
  const { data } = await supabase
    .from("chat_members")
    .select("user_id,last_read_at")
    .eq("chat_id", chatId)
    .neq("user_id", myId);
  const out: Record<string, string | null> = {};
  for (const row of (data ?? []) as { user_id: string; last_read_at: string | null }[]) {
    out[row.user_id] = row.last_read_at;
  }
  return out;
}

/** last_read_at خودم در این چت (برای تعیین اولین پیام نخوانده) */
async function fetchMyLastRead(
  chatId: string,
  myId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("chat_members")
    .select("last_read_at")
    .eq("chat_id", chatId)
    .eq("user_id", myId)
    .single();
  return (data as { last_read_at: string | null } | null)?.last_read_at ?? null;
}

function latestPeerRead(peers: Record<string, string | null>): string | null {
  let latest: number | null = null;
  for (const t of Object.values(peers)) {
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (!Number.isNaN(ms) && (latest === null || ms > latest)) latest = ms;
  }
  return latest === null ? null : new Date(latest).toISOString();
}

export function useMessages(chatId: string | null, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(chatId !== null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [peersLastRead, setPeersLastRead] = useState<Record<string, string | null>>({});
  /** snapshot از last_read_at قبل از باز شدن چت — برای خط «پیام‌های جدید» */
  const [initialMyLastRead, setInitialMyLastRead] = useState<string | null>(null);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!chatId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on chat change
      setMessages([]);
      setPeersLastRead({});
      setInitialMyLastRead(null);
      setHasMore(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      fetchPage(chatId),
      fetchPeersLastRead(chatId, userId),
      fetchMyLastRead(chatId, userId),
    ]).then(([page, peers, myRead]) => {
      if (cancelled) return;
      setMessages(page.rows);
      setHasMore(page.hasMore);
      setPeersLastRead(peers);
      setInitialMyLastRead(myRead);
      setLoading(false);
    });

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const old = payload.old as Partial<Message>;
          if (!old?.id) return;
          setMessages((prev) => prev.filter((x) => x.id !== old.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_members", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          if (!row?.user_id || row.user_id === userId) return;
          setPeersLastRead((prev) => ({ ...prev, [row.user_id]: row.last_read_at }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);

  /** بارگذاری صفحه‌ی قدیمی‌تر (برای infinite scroll به بالا). */
  const loadMore = useCallback(async () => {
    if (!chatId || loadingMore || !hasMore) return;
    const first = messagesRef.current[0];
    if (!first) return;
    setLoadingMore(true);
    const { rows, hasMore: more } = await fetchPage(chatId, first.created_at);
    setMessages((prev) => {
      // merge without duplicates
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...rows.filter((r) => !seen.has(r.id)), ...prev];
      return merged;
    });
    setHasMore(more);
    setLoadingMore(false);
  }, [chatId, hasMore, loadingMore]);

  const send = useCallback(
    async (type: string, content: MessageContent, replyToId?: string | null) => {
      if (!chatId) return;
      const tempId = crypto.randomUUID();
      const optimistic: Message = {
        id: tempId,
        chat_id: chatId,
        sender_id: userId,
        type,
        content,
        reply_to_id: replyToId ?? null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        status: "sending",
      };
      setMessages((p) => [...p, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: userId,
          type,
          content,
          reply_to_id: replyToId ?? null,
        })
        .select()
        .single();

      setMessages((p) => {
        if (error || !data) {
          return p.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m));
        }
        const exists = p.some((m) => m.id === (data as Message).id);
        return exists
          ? p.filter((m) => m.id !== tempId)
          : p.map((m) =>
              m.id === tempId ? { ...(data as Message), status: "sent" } : m
            );
      });
    },
    [chatId, userId]
  );

  const edit = useCallback(
    async (messageId: string, newText: string) => {
      const t = newText.trim();
      if (!t) return;
      setMessages((p) =>
        p.map((m) =>
          m.id === messageId
            ? { ...m, content: { ...m.content, text: t }, edited_at: new Date().toISOString() }
            : m
        )
      );
      const { error } = await supabase
        .from("messages")
        .update({
          content: { text: t },
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error && chatId) {
        const { rows } = await fetchPage(chatId);
        setMessages(rows);
      }
    },
    [chatId, userId]
  );

  const remove = useCallback(
    async (messageId: string) => {
      setMessages((p) =>
        p.map((m) =>
          m.id === messageId
            ? { ...m, deleted_at: new Date().toISOString(), content: {} }
            : m
        )
      );
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString(), content: {} })
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error && chatId) {
        const { rows } = await fetchPage(chatId);
        setMessages(rows);
      }
    },
    [chatId, userId]
  );

  const markRead = useCallback(async () => {
    if (!chatId) return;
    await supabase.rpc("mark_chat_read", { chat: chatId });
  }, [chatId]);

  const getById = useCallback(
    (id: string | null) => (id ? messagesRef.current.find((m) => m.id === id) : undefined),
    []
  );

  const latestRead = useMemo(() => latestPeerRead(peersLastRead), [peersLastRead]);

  const decorated = useMemo(() => {
    if (!latestRead) return messages;
    const latestMs = new Date(latestRead).getTime();
    return messages.map((m) => {
      if (m.sender_id !== userId) return m;
      if (m.status === "sending" || m.status === "failed") return m;
      const createdMs = new Date(m.created_at).getTime();
      const next: Message["status"] =
        createdMs <= latestMs ? "read" : "sent";
      return m.status === next ? m : { ...m, status: next };
    });
  }, [messages, latestRead, userId]);

  /**
   * id اولین پیامی که دریافت شده (نه از خودم) و بعد از initialMyLastRead است.
   * این snapshot پایدار می‌ماند حتی اگر markRead بعداً اجرا شود، تا خط «پیام‌های جدید»
   * ثابت بماند و با هر پیام جدید جابه‌جا نشود.
   */
  const firstUnreadId = useMemo<string | null>(() => {
    if (!initialMyLastRead) return null;
    const cutoff = new Date(initialMyLastRead).getTime();
    for (const m of decorated) {
      if (m.sender_id === userId) continue;
      const t = new Date(m.created_at).getTime();
      if (!Number.isNaN(t) && t > cutoff) return m.id;
    }
    return null;
  }, [decorated, initialMyLastRead, userId]);

  return {
    messages: decorated,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    send,
    edit,
    remove,
    markRead,
    getById,
    firstUnreadId,
  };
}
