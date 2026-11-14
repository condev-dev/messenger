"use client";

import * as React from "react";
import { createElement, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle, Reply as ReplyIcon, Pin, Forward as ForwardIcon } from "lucide-react";
import type { Message, ReplyRef } from "../types";
import { getRenderer } from "../messages/registry";
import { isEmojiOnly, emojiJumboClass } from "../lib/emoji";
import { bubbleIn } from "@/lib/motion";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useReactions } from "../hooks/useReactions";

type Group = "single" | "first" | "middle" | "last";

export type BubbleContextInfo = {
  message: Message;
  x: number;
  y: number;
  mine: boolean;
};

export function MessageBubble({
  message,
  mine,
  group,
  userId,
  replyRef,
  highlighted,
  forwardedFromName,
  onContextMenu,
  onReply,
  onReplyClick,
  bubbleRef,
}: {
  message: Message;
  mine: boolean;
  group: Group;
  userId: string;
  replyRef?: ReplyRef | null;
  highlighted?: boolean;
  /** اگر پیام forward است و فرستنده‌ی اصلی مشخص است */
  forwardedFromName?: string | null;
  onContextMenu?: (info: BubbleContextInfo) => void;
  onReply?: (message: Message) => void;
  onReplyClick?: (id: string) => void;
  bubbleRef?: (el: HTMLDivElement | null) => void;
}) {
  const hasTail = group === "single" || group === "last";
  const isDeleted = !!message.deleted_at;

  // آیا پیام فقط ایموجی است؟ → نمایش بزرگ بدون حباب (مثل تلگرام)
  const textContent = typeof message.content.text === "string" ? message.content.text : "";
  const isJumbo =
    !isDeleted &&
    message.type === "text" &&
    !replyRef &&
    isEmojiOnly(textContent);

  // شعاع‌های حباب برای گروه‌بندی عمودی
  const radius = (() => {
    const full = "var(--radius-bubble)";
    const tight = "6px";
    if (mine) {
      return {
        borderTopRightRadius: group === "single" || group === "first" ? full : tight,
        borderBottomRightRadius: group === "single" || group === "last" ? full : tight,
        borderTopLeftRadius: full,
        borderBottomLeftRadius: full,
      };
    }
    return {
      borderTopLeftRadius: group === "single" || group === "first" ? full : tight,
      borderBottomLeftRadius: group === "single" || group === "last" ? full : tight,
      borderTopRightRadius: full,
      borderBottomRightRadius: full,
    };
  })();

  // Long-press برای موبایل
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false);

  const startPress = (x: number, y: number) => {
    pressed.current = false;
    pressTimer.current = setTimeout(() => {
      pressed.current = true;
      onContextMenu?.({ message, x, y, mine });
    }, 450);
  };
  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Swipe to reply
  const swipeStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    const t = e.touches[0];
    if (t) {
      swipeStartX.current = t.clientX;
      startPress(t.clientX, t.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - swipeStartX.current;
    const dir = mine ? -1 : 1;
    const offset = Math.max(0, Math.min(80, dx * dir));
    setSwipeOffset(offset);
    clearPress();
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= SWIPE_THRESHOLD) {
      onReply?.(message);
    }
    setSwipeOffset(0);
    swipeStartX.current = null;
    clearPress();
  };

  const handleClick = (e: React.MouseEvent) => {
    // روی موبایل (touch)، تپ کوتاه context menu را باز می‌کند
    if (isDeleted || !onContextMenu) return;
    // فقط روی صفحات لمسی
    if (window.matchMedia("(pointer: coarse)").matches) {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onContextMenu({ message, x: rect.left + rect.width / 2, y: rect.top, mine });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDeleted || !onContextMenu) return;
    e.preventDefault();
    onContextMenu({ message, x: e.clientX, y: e.clientY, mine });
  };

  const { reactions, toggleReaction } = useReactions(message.id, userId);
  const Renderer = getRenderer(message.type);

  return (
    <motion.div
      layout="position"
      variants={bubbleIn(mine)}
      initial="initial"
      animate="animate"
      className={cn(
        "flex w-full",
        mine ? "justify-start" : "justify-end",
        group === "first" || group === "single" ? "mt-2.5" : "mt-0.5"
      )}
    >
      <motion.div
        ref={(el) => bubbleRef?.(el)}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchEnd}
        animate={{
          backgroundColor: isJumbo
            ? "rgba(0,0,0,0)"
            : highlighted
            ? "var(--brand-soft)"
            : mine
            ? "var(--bubble-out)"
            : "var(--bubble-in)",
        }}
        transition={{ duration: 0.4 }}
        className={cn(
          "relative max-w-[78%] md:max-w-[65%] text-[14.5px] leading-6",
          isJumbo ? "px-1 py-1" : "px-3 py-1.5 shadow-bubble",
          mine ? "text-bubble-out-fg" : "text-bubble-in-fg",
          isDeleted && "italic opacity-70"
        )}
        style={isJumbo ? undefined : radius}
      >
        {/* دم حباب (فقط روی آخرین پیام گروه، نه در حالت jumbo) */}
        {hasTail && !isJumbo && (
          <span
            aria-hidden
            className={cn(
              "absolute bottom-0 block size-3 overflow-hidden",
              mine ? "-start-1.5" : "-end-1.5"
            )}
          >
            <span
              className={cn(
                "absolute inset-0 block",
                mine ? "bg-bubble-out" : "bg-bubble-in"
              )}
              style={{
                clipPath: mine
                  ? "polygon(100% 0, 100% 100%, 0 100%)"
                  : "polygon(0 0, 100% 100%, 0 100%)",
              }}
            />
          </span>
        )}

        {/* برچسب «هدایت‌شده از …» */}
        {forwardedFromName && !isDeleted && !isJumbo && (
          <div
            className={cn(
              "flex items-center gap-1 mb-1 text-[11px] font-medium",
              mine ? "text-white/80" : "text-primary"
            )}
          >
            <ForwardIcon className="size-3 shrink-0" />
            <span className="truncate">
              هدایت‌شده از <span className="font-semibold">{forwardedFromName}</span>
            </span>
          </div>
        )}

        {/* Reply preview */}
        {replyRef && !isDeleted && (
          <button
            type="button"
            onClick={() => onReplyClick?.(replyRef.id)}
            className={cn(
              "flex w-full items-stretch gap-2 mb-1.5 rounded-md overflow-hidden text-start",
              "transition-colors",
              mine
                ? "bg-white/15 hover:bg-white/20"
                : "bg-primary/5 hover:bg-primary/10"
            )}
          >
            <span
              className={cn(
                "w-0.5 shrink-0",
                mine ? "bg-white/80" : "bg-primary"
              )}
            />
            <span className="py-1 pe-2 flex items-center gap-1.5 min-w-0 flex-1">
              <ReplyIcon
                className={cn(
                  "size-3 shrink-0",
                  mine ? "text-white/80" : "text-primary"
                )}
              />
              <span className="min-w-0 leading-tight">
                <span
                  className={cn(
                    "block text-[11px] font-semibold",
                    mine ? "text-white" : "text-primary"
                  )}
                >
                  {replyRef.sender_name}
                </span>
                <span
                  className={cn(
                    "block truncate text-[12px]",
                    mine ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {replyRef.preview}
                </span>
              </span>
            </span>
          </button>
        )}

        <div className="min-w-0">
          {isDeleted ? (
            <p className="whitespace-pre-wrap">این پیام حذف شد</p>
          ) : isJumbo ? (
            <p className={cn(emojiJumboClass(textContent), "select-text")}>{textContent}</p>
          ) : (
            createElement(Renderer, { message })
          )}
        </div>

        {/* متای پیام: زمان + وضعیت */}
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 justify-end text-[10.5px] tabular-nums",
            isJumbo
              ? "text-muted-foreground"
              : mine
              ? "text-white/80"
              : "text-bubble-in-fg/60"
          )}
        >
          {message.pinned_at && !isDeleted && (
            <Pin className="size-3 shrink-0" aria-label="پین‌شده" />
          )}
          {message.edited_at && !isDeleted && <span className="italic">ویرایش‌شده</span>}
          <span>{formatTime(message.created_at)}</span>
          {mine && !isDeleted && <StatusIcon status={message.status} isJumbo={isJumbo} />}
        </div>
        {/* واکنش‌ها */}
        {reactions.length > 0 && !isDeleted && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => toggleReaction(r.emoji)}
                className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border",
                  r.mine
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-border/60"
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatusIcon({ status, isJumbo }: { status?: Message["status"]; isJumbo?: boolean }) {
  if (status === "sending") return <Clock className="size-3 opacity-80" />;
  if (status === "failed") return <AlertCircle className="size-3 text-red-200" />;
  if (status === "read") return <CheckCheck className="size-3.5 text-tick" />;
  if (status === "delivered")
    return <CheckCheck className={cn("size-3.5", isJumbo ? "opacity-70" : "opacity-90")} />;
  return <Check className={cn("size-3.5", isJumbo ? "opacity-70" : "opacity-90")} />;
}
