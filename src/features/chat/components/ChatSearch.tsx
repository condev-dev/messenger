"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { duration, easing } from "@/lib/motion";
import type { Message } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  /** وقتی کاربر روی نتیجه‌ی خاصی ناوبری می‌کند. */
  onJumpTo: (messageId: string) => void;
};

/** استخراج متن قابل جستجو از یک پیام. */
function searchableText(m: Message): string {
  if (m.deleted_at) return "";
  const parts: string[] = [];
  const c = m.content as Record<string, unknown> | undefined;
  if (typeof c?.text === "string") parts.push(c.text);
  if (typeof c?.caption === "string") parts.push(c.caption);
  if (typeof c?.name === "string") parts.push(c.name as string);
  if (typeof c?.title === "string") parts.push(c.title as string);
  return parts.join(" ");
}

export function ChatSearch({ open, onClose, messages, onJumpTo }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // reset هنگام باز شدن
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when drawer opens
    setQuery("");
    setCursor(0);
    // تاخیر کوچک تا انیمیشن ورود تمام شود
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Message[];
    return messages.filter((m) => searchableText(m).toLowerCase().includes(q));
  }, [messages, query]);

  // جدیدترین نتیجه اول (برای ناوبری «قبلی» = نزدیک‌تر به پایین)
  const ordered = useMemo(() => [...matches].reverse(), [matches]);

  // هنگام تغییر مجموعه نتایج: cursor رو محدود کن و اگر معتبر بود جامپ بزن
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp cursor when result set changes
    setCursor((c) => {
      if (ordered.length === 0) return 0;
      const next = Math.min(c, ordered.length - 1);
      const target = ordered[next];
      if (target) onJumpTo(target.id);
      return next;
    });
  }, [ordered, onJumpTo]);

  const goPrev = () => {
    if (ordered.length === 0) return;
    const next = (cursor + 1) % ordered.length;
    setCursor(next);
    onJumpTo(ordered[next].id);
  };
  const goNext = () => {
    if (ordered.length === 0) return;
    const next = (cursor - 1 + ordered.length) % ordered.length;
    setCursor(next);
    onJumpTo(ordered[next].id);
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="chat-search"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: { duration: duration.base, ease: easing.out },
          }}
          exit={{ height: 0, opacity: 0, transition: { duration: duration.fast } }}
          className="overflow-hidden border-b border-border/70 bg-panel"
        >
          <div className="mx-auto max-w-4xl flex items-center gap-2 px-3 py-2">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  else if (e.key === "Enter") {
                    if (e.shiftKey) goNext();
                    else goPrev();
                  }
                }}
                placeholder="جستجو در این چت…"
                className="w-full rounded-lg bg-muted/70 focus:bg-muted px-8 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
              />
            </div>

            <div className="text-[11px] text-muted-foreground tabular-nums min-w-[52px] text-center">
              {ordered.length > 0 ? `${cursor + 1}/${ordered.length}` : query ? "۰" : ""}
            </div>

            <IconButton
              aria-label="نتیجه‌ی قبلی"
              size="sm"
              onClick={goPrev}
              disabled={ordered.length === 0}
            >
              <ChevronDown />
            </IconButton>
            <IconButton
              aria-label="نتیجه‌ی بعدی"
              size="sm"
              onClick={goNext}
              disabled={ordered.length === 0}
            >
              <ChevronUp />
            </IconButton>
            <IconButton aria-label="بستن جستجو" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
