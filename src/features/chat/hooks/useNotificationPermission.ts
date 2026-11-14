"use client";

import { useCallback, useEffect, useState } from "react";

export type NotifPermState = "unsupported" | "default" | "granted" | "denied";

/**
 * مدیریت وضعیت permission اعلان‌های دسکتاپ.
 * - state فعلی را برمی‌گرداند
 * - request را روی user gesture صدا می‌زند
 * - به تغییرات permission (از طریق permissions API) گوش می‌دهد
 */
export function useNotificationPermission() {
  const [state, setState] = useState<NotifPermState>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial browser-only permission
      setState("unsupported");
      return;
    }
    setState(Notification.permission as NotifPermState);

    // بعضی مرورگرها از permissions.query برای notifications پشتیبانی می‌کنند
    let cleanup: (() => void) | null = null;
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          const onChange = () => setState(status.state as NotifPermState);
          status.addEventListener("change", onChange);
          cleanup = () => status.removeEventListener("change", onChange);
        })
        .catch(() => {
          /* ignore */
        });
    }
    return () => {
      cleanup?.();
    };
  }, []);

  const request = useCallback(async (): Promise<NotifPermState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    const result = await Notification.requestPermission();
    setState(result as NotifPermState);
    return result as NotifPermState;
  }, []);

  return { state, request } as const;
}
