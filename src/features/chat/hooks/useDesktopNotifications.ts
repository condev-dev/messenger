"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "../types";

/**
 * Notification دسکتاپ هنگام رسیدن پیام جدید وقتی تب focus نیست.
 *
 * - از Supabase Realtime روی جدول messages گوش می‌دهد.
 * - فقط پیام‌هایی از طرف دیگران را notify می‌کند.
 * - اگر کاربر permission ندهد، بی‌صدا رد می‌شود.
 * - اگر SW ثبت شده باشد، از آن استفاده می‌کند (تا notification حتی بعد از بسته‌شدن تب هم کلیک‌پذیر باشد).
 */
export function useDesktopNotifications(
  userId: string,
  getPeerName: (senderId: string) => string
) {
  const peerNameRef = useRef(getPeerName);
  useEffect(() => {
    peerNameRef.current = getPeerName;
  }, [getPeerName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    // permission فقط با user gesture صدا زده می‌شود (در Settings).
    // اینجا فقط subscribe می‌کنیم و اگر granted نبود، در لحظه‌ی پیام رد می‌شویم.

    const channel = supabase
      .channel("desktop-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as Message;
          if (!m) return;
          if (m.sender_id === userId) return; // پیام خودم
          if (document.visibilityState === "visible" && document.hasFocus()) {
            return; // تب focus است
          }
          if (Notification.permission !== "granted") return;

          const title = peerNameRef.current(m.sender_id) || "پیام جدید";
          const body =
            m.type === "text"
              ? String(m.content?.text ?? "")
              : m.type === "image"
              ? "🖼 عکس"
              : m.type === "gif"
              ? "🎞 گیف"
              : m.type === "file"
              ? "📎 فایل"
              : "پیام جدید";

          // renotify فیلد غیراستاندارد روی NotificationOptions است (در Chrome کار می‌کند
          // ولی در typeهای رسمی DOM ـ lib نیست). با Record<string, unknown> پاس می‌دهیم.
          const options = {
            body: body.slice(0, 140),
            icon: "/icons/icon-192.svg",
            badge: "/icons/icon-192.svg",
            tag: `chat:${m.chat_id}`,
            renotify: true,
            dir: "rtl",
            lang: "fa",
            data: { chat_id: m.chat_id, url: "/chat" },
          } as NotificationOptions;

          // ترجیح: SW notification تا بعد از بسته‌شدن تب هم قابل کلیک باشد
          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg) {
                await reg.showNotification(title, options);
                return;
              }
            }
          } catch {
            // fallback به نسخه‌ی پنجره‌ای
          }

          try {
            const n = new Notification(title, options);
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch {
            /* ignore */
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
