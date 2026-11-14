"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { duration, easing } from "@/lib/motion";

const STICKERS = [
  "😀","😂","😍","🥰","😎","🤩","😭","😡","🤔","😱",
  "👍","👎","👏","🙏","🤝","💪","🎉","🔥","❤️","💔",
  "🐶","🐱","🦊","🐻","🐼","🐸","🐵","🦄","🐝","🦋",
  "🍕","🍔","🍟","🍩","🍪","🍫","☕","🍺","🍷","🎂",
  "⚽","🏀","🎮","🎸","🎤","🎬","✈️","🚗","🏠","⭐",
];

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function StickerPicker({ open, anchorRect, onPick, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const W = 320;
  const H = 360;
  let left = 16;
  let top = 100;
  if (anchorRect) {
    left = Math.max(8, Math.min(window.innerWidth - W - 8, anchorRect.right - W));
    top = Math.max(8, Math.min(window.innerHeight - H - 8, anchorRect.top - H - 8));
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: duration.base, ease: easing.out } }}
          exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: duration.fast } }}
          className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/60 bg-panel"
          style={{ left, top, width: W, height: H }}
        >
          <div className="h-full overflow-y-auto p-3 grid grid-cols-6 gap-2 content-start">
            {STICKERS.map((e, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onPick(e); onClose(); }}
                className="text-3xl leading-none p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}