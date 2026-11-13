"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, Sparkles } from "lucide-react";
import { duration, easing } from "@/lib/motion";
import { hasKlipy, klipySearch, klipyTrending, type GifItem } from "../lib/klipy";

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  onPick: (gif: GifItem) => void;
  onClose: () => void;
};

export function GifPicker({ open, anchorRect, onPick, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // بستن با Escape و کلیک خارج
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(
      () => document.addEventListener("mousedown", onDown),
      50
    );
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // بار اول + جستجوی debounce ترکیب شده
  useEffect(() => {
    if (!open || !hasKlipy()) return;
    const ac = new AbortController();
    let cancel = false;

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      (query.trim() ? klipySearch(query, 24, ac.signal) : klipyTrending(24, ac.signal))
        .then((r) => {
          if (!cancel) setItems(r);
        })
        .catch((e: unknown) => {
          if (cancel) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError("خطا در دریافت گیف‌ها");
        })
        .finally(() => {
          if (!cancel) setLoading(false);
        });
    }, 300);

    return () => {
      cancel = true;
      ac.abort();
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, open]);

  if (typeof document === "undefined") return null;

  const W = 360;
  const H = 440;
  const GAP = 8;

  let left = 16;
  let top = 100;
  if (anchorRect) {
    left = Math.max(
      8,
      Math.min(window.innerWidth - W - 8, anchorRect.right - W)
    );
    top = Math.max(
      8,
      Math.min(window.innerHeight - H - 8, anchorRect.top - H - GAP)
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: duration.base, ease: easing.out },
          }}
          exit={{
            opacity: 0,
            y: 6,
            scale: 0.97,
            transition: { duration: duration.fast },
          }}
          className="fixed z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/60 bg-panel"
          style={{ left, top, width: W, height: H, transformOrigin: "bottom right" }}
        >
          {/* هدر جستجو */}
          <div className="shrink-0 flex items-center gap-2 p-2 border-b border-border/60">
            <div className="relative flex-1">
              <Search className="absolute start-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی GIF…"
                className="w-full rounded-lg bg-muted/70 focus:bg-muted px-8 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="پاک کردن"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* بدنه */}
          <div className="flex-1 overflow-y-auto p-2">
            {!hasKlipy() ? (
              <div className="grid place-items-center h-full text-center p-4">
                <div className="space-y-2 max-w-[260px]">
                  <Sparkles className="mx-auto size-8 text-primary" />
                  <p className="text-sm font-semibold">گیف فعال نیست</p>
                  <p className="text-[12px] text-muted-foreground leading-6">
                    برای فعال‌سازی، یک API key رایگان از{" "}
                    <a
                      href="https://partner.klipy.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      KLIPY
                    </a>{" "}
                    بگیرید و در <code>.env.local</code> به صورت{" "}
                    <code className="text-[11px] bg-muted px-1 rounded">
                      NEXT_PUBLIC_KLIPY_API_KEY
                    </code>{" "}
                    قرار دهید.
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="grid place-items-center h-full">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="grid place-items-center h-full text-sm text-muted-foreground">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="grid place-items-center h-full text-sm text-muted-foreground">
                چیزی پیدا نشد
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((g) => (
                  <motion.button
                    key={g.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onPick(g)}
                    className="relative aspect-square overflow-hidden rounded-md bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    aria-label={g.title || "gif"}
                  >
                    <Image
                      src={g.preview}
                      alt={g.title || "gif"}
                      fill
                      unoptimized
                      sizes="170px"
                      className="object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* فوتر — attribution طبق قوانین Klipy */}
          <div className="shrink-0 flex items-center justify-center py-1 text-[10px] text-muted-foreground border-t border-border/60">
            Powered by KLIPY
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
