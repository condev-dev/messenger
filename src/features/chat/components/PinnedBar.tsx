"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { Message } from "../types";

type Props = {
  /** پیام‌های پین‌شده‌ی چت (مرتب‌شده از جدید به قدیم) */
  pinned: Message[];
  /** کلیک روی نوار → اسکرول به پیام فعلی */
  onJump: (messageId: string) => void;
  /** آن‌پین کردن پیام فعلی */
  onUnpin?: (messageId: string) => void;
};

function previewOf(m: Message): string {
  if (m.deleted_at) return "پیام حذف‌شده";
  if (m.type === "text") return String(m.content.text ?? "");
  if (m.type === "image") return `🖼 ${String(m.content.caption ?? "عکس")}`;
  if (m.type === "gif") return "🎞 گیف";
  if (m.type === "file") return `📎 ${String(m.content.name ?? "فایل")}`;
  return "پیام";
}

/**
 * نوار پیام پین‌شده مثل تلگرام: نشان زرد باریک + آیکن Pin + پیش‌نمایش.
 * اگر چند پین باشند، کلیک بین آن‌ها می‌چرخد (آخرین اول).
 */
export function PinnedBar({ pinned, onJump, onUnpin }: Props) {
  const [index, setIndex] = React.useState(0);

  if (pinned.length === 0) return null;

  // کپ کردن index وقتی پین‌ها کم می‌شوند (بدون effect)
  const safeIndex = index >= pinned.length ? 0 : index;
  const current = pinned[safeIndex];
  if (!current) return null;

  const handleClick = () => {
    onJump(current.id);
    // در صورت چند پین بودن، پس از پرش به بعدی حرکت کنیم
    if (pinned.length > 1) {
      setIndex((i) => {
        const base = i >= pinned.length ? 0 : i;
        return (base + 1) % pinned.length;
      });
    }
  };

  const total = pinned.length;
  const label =
    total > 1
      ? `پیام پین‌شده (${(safeIndex + 1).toLocaleString("fa-IR")}/${total.toLocaleString("fa-IR")})`
      : "پیام پین‌شده";

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="pinned-bar"
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={spring.snappy}
        className="shrink-0 overflow-hidden border-b border-border/70 bg-panel/80 backdrop-blur"
      >
        <div className="h-11 flex items-center gap-2 px-3 md:px-4">
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "group flex items-center gap-2.5 min-w-0 flex-1 text-start",
              "rounded-md px-1.5 py-1 hover:bg-accent/60 transition-colors"
            )}
          >
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-[3px] h-7 rounded-full bg-primary/80" />
              <Pin className="size-3.5 text-primary" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[11px] font-semibold text-primary">
                {label}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {previewOf(current).slice(0, 120)}
              </span>
            </span>
          </button>
          {onUnpin && (
            <button
              type="button"
              onClick={() => onUnpin(current.id)}
              className="shrink-0 size-7 rounded-full grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="برداشتن پین"
              title="برداشتن پین"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
