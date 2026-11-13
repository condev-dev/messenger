"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { duration, easing } from "@/lib/motion";

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

// Type برای رویداد انتخاب ایموجی که emoji-mart می‌فرستد
type EmojiSelectEvent = { native: string; id: string; name: string; unified: string };

/**
 * EmojiPicker — پیکر ایموجی با الهام از تلگرام
 * - سبک تم با next-themes
 * - Portal به body تا hover/scroll parent را نشکند
 * - کلیک بیرون = بسته شدن
 */
export function EmojiPicker({ open, anchorRect, onPick, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Build picker on open
  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let picker: HTMLElement | null = null;

    (async () => {
      const [{ Picker }, dataMod] = await Promise.all([
        import("emoji-mart"),
        import("@emoji-mart/data"),
      ]);

      if (cancelled) return;

      host.innerHTML = "";

      // emoji-mart Picker یک custom element است
      picker = new Picker({
        data: dataMod.default,
        onEmojiSelect: (e: EmojiSelectEvent) => onPick(e.native),
        theme: resolvedTheme === "dark" ? "dark" : "light",
        locale: "fa",
        previewPosition: "none",
        skinTonePosition: "search",
        searchPosition: "sticky",
        navPosition: "top",
        perLine: 8,
        maxFrequentRows: 2,
        autoFocus: false,
        set: "native",
        dynamicWidth: false,
      }) as unknown as HTMLElement;

      host.appendChild(picker);
    })();

    return () => {
      cancelled = true;
      if (host) host.innerHTML = "";
      picker = null;
    };
  }, [open, resolvedTheme, onPick]);

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

  if (typeof document === "undefined") return null;

  // محاسبه موقعیت
  const PICKER_W = 352;
  const PICKER_H = 420;
  const GAP = 8;

  let left = 16;
  let top = 100;
  if (anchorRect) {
    left = Math.max(
      8,
      Math.min(window.innerWidth - PICKER_W - 8, anchorRect.right - PICKER_W)
    );
    top = Math.max(
      8,
      Math.min(
        window.innerHeight - PICKER_H - 8,
        anchorRect.top - PICKER_H - GAP
      )
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          dir="ltr"
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
          className="fixed z-50"
          style={{ left, top, transformOrigin: "bottom right" }}
        >
          <div
            ref={hostRef}
            className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/60 bg-panel"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
