import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata = {
  title: "مسنجر",
  description: "پیام‌رسان لحظه‌ای",
  manifest: "/manifest.webmanifest",
  applicationName: "مسنجر",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "مسنجر",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192" }],
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF2F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

// جلوگیری از FOUC تم: قبل از hydrate، کلاس dark روی html ست می‌شود.
const themeScript = `
(function () {
  try {
    var k = "masanger-theme";
    var t = localStorage.getItem(k) || "system";
    var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (_) {}
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-app-bg text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
