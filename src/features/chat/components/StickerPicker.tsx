"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Upload } from "lucide-react";
import { duration, easing } from "@/lib/motion";
import type { StickerItem } from "../hooks/useStickers";

const EMOJI_STICKERS = [
  "😀","😂","😍","🥰","😎","🤩","😭","😡","🤔","😱",
  "👍","👎","👏","🙏","🤝","💪","🎉","🔥","❤️","💔",
  "🐶","🐱","🦊","🐻","🐼","🐸","🐵","🦄","🐝","🦋",
  "🍕","🍔","🍟","🍩","🍪","🍫","☕","🍺","🍷","🎂",
  "⚽","🏀","🎮","🎸","🎤","🎬","✈️","🚗","🏠","⭐",
];

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  stickers: StickerItem[];
  onPick: (value: string, isImage: boolean) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
};

export function StickerPicker({ open, anchorRect, stickers, onPick, onUpload, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const H = 380;
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
          className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/60 bg-panel flex flex-col"
          style={{ left, top, width: W, height: H }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <span className="text-xs font-semibold text-muted-foreground">استیکرها</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Upload className="size-3.5" />
              آپلود
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {stickers.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {stickers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick(s.url, true)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt="استیکر" className="w-full h-auto object-contain max-h-16" />
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_STICKERS.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(e, false)}
                  className="text-3xl leading-none p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}