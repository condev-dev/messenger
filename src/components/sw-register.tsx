"use client";

import { useEffect } from "react";

/**
 * ثبت Service Worker. فقط در production ثبت می‌شود.
 * در dev می‌تواند با caching هوشمند HMR را بشکند، پس فعال نیست.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        // در صورت خطا، نشکند — صرفاً PWA را غیرفعال کند.
        console.warn("SW registration failed:", err);
      }
    };
    void register();
  }, []);

  return null;
}
