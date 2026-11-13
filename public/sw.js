/**
 * Masanger Service Worker — نسخه‌ی اولیه (v1)
 * -----------------------------------------------
 * - کش کردن app shell و ناوبری با استراتژی "network-first with offline fallback"
 *   (برای مسنجر، تازگی داده‌ها از پیشرو است)
 * - کش استاتیک برای /manifest, آیکن‌ها و فونت‌ها
 * - هندل نوتیفیکیشن Push و کلیک (برای وقتی Web Push فعال شود)
 */

const SW_VERSION = "masanger-v1";
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(SW_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // از کش کردن APIهای مهم و Realtime عبور کن
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("klipy.com") ||
    url.hostname.includes("tenor.com")
  ) {
    return; // بذار مرورگر مستقیم انجام بده
  }

  // ناوبری HTML: network-first با فالبک آفلاین
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // استاتیک: cache-first
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
  }
});

// ---------- Web Push (آماده برای فاز بعدی) ----------
self.addEventListener("push", (event) => {
  let data = { title: "پیام جدید", body: "", url: "/chat" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      dir: "rtl",
      lang: "fa",
      data: { url: data.url || "/chat" },
      tag: data.tag || undefined,
      renotify: !!data.tag,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/chat";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
