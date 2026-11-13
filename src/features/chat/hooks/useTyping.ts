"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * useTyping — نمایش و انتشار وضعیت «در حال نوشتن…» با Supabase Realtime Broadcast
 *
 * منطق:
 *  - کانال `typing:<chatId>` مشترک بین هر دو طرف
 *  - وقتی کاربر چیزی تایپ می‌کند: notifyTyping() را صدا می‌زنیم
 *    → broadcast event="typing" با {user_id, started_at}
 *    → debounce داخلی: حداکثر هر ۲ ثانیه یک بار پیام می‌فرستیم
 *  - دریافت: اگر event از user دیگر رسید، آن user را به state typingUsers اضافه می‌کنیم
 *    و یک timer ۴ ثانیه‌ای تنظیم می‌کنیم؛ اگر پیام جدیدی نرسد پاک می‌شود
 *  - stopTyping(): می‌تواند اختیاری event="stop" بفرستد ولی تایمر خودکار کافی است
 */
export function useTyping(chatId: string | null, userId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAtRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Subscribe to typing channel
  useEffect(() => {
    if (!chatId) return;

    const ch = supabase.channel(`typing:${chatId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "typing" }, (payload) => {
      const uid = (payload.payload as { user_id?: string })?.user_id;
      if (!uid || uid === userId) return;

      setTypingUsers((prev) => {
        if (prev.has(uid)) return prev;
        const next = new Set(prev);
        next.add(uid);
        return next;
      });

      // reset timer
      const prevTimer = timersRef.current.get(uid);
      if (prevTimer) clearTimeout(prevTimer);
      const t = setTimeout(() => {
        setTypingUsers((prev) => {
          if (!prev.has(uid)) return prev;
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
        timersRef.current.delete(uid);
      }, 4000);
      timersRef.current.set(uid, t);
    });

    ch.on("broadcast", { event: "stop" }, (payload) => {
      const uid = (payload.payload as { user_id?: string })?.user_id;
      if (!uid || uid === userId) return;
      const t = timersRef.current.get(uid);
      if (t) {
        clearTimeout(t);
        timersRef.current.delete(uid);
      }
      setTypingUsers((prev) => {
        if (!prev.has(uid)) return prev;
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    });

    ch.subscribe();
    channelRef.current = ch;

    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setTypingUsers(new Set());
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [chatId, userId]);

  const notifyTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const now = Date.now();
    // Throttle: حداکثر هر ۲ ثانیه یک بار
    if (now - lastSentAtRef.current < 2000) return;
    lastSentAtRef.current = now;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, ts: now },
    });
  }, [userId]);

  const stopTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    lastSentAtRef.current = 0;
    void ch.send({
      type: "broadcast",
      event: "stop",
      payload: { user_id: userId },
    });
  }, [userId]);

  return { typingUsers, notifyTyping, stopTyping };
}
