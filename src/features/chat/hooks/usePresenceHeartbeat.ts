"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * به‌صورت دوره‌ای last_seen_at کاربر فعلی را به‌روز می‌کند.
 * - یک بار در mount
 * - هر 30 ثانیه در حالی که tab visible است
 * - وقتی کاربر دوباره به tab برمی‌گردد
 */
export function usePresenceHeartbeat(enabled: boolean, intervalMs = 30_000) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const touch = async () => {
      if (cancelled) return;
      try {
        await supabase.rpc("touch_last_seen");
      } catch {
        // بی‌صدا؛ احتمالاً migration 002 هنوز اجرا نشده
      }
    };

    void touch();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void touch();
    }, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void touch();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}
