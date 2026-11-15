"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar-smart";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { formatChatListTime } from "@/lib/date";
import type { ChatItem } from "../types";

export function ChatList({
  chats,
  activeId,
  onSelect,
  loading,
  onRefresh,
  folder,
  onFolderChange,
}: {
  chats: ChatItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
  folder?: string;
  onFolderChange?: (f: string) => void;
}) {
  // Online dot: update "now" every 30s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Pull to refresh
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const PULL_THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.currentTarget.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      onRefresh();
    }
    setPullDistance(0);
    touchStartY.current = null;
  };
  // Filter chats by folder
  const filteredChats = chats.filter((c) => {
    if (!folder || folder === "all") return true;
    if (folder === "unread") return (c.unread ?? 0) > 0;
    if (folder === "groups") return c.type === "group";
    if (folder === "personal") return c.type === "direct";
    return true;
  });

  // Sort: pinned first
  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  if (loading && chats.length === 0) {
    return (
      <ul className="p-2 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-2">
            <div className="size-12 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-40 bg-muted rounded animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="h-full grid place-items-center text-center px-6 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">هنوز گفتگویی ندارید</p>
          <p className="mt-1">با دکمهٔ «چت جدید» شروع کنید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Folder tabs */}
      {onFolderChange && (
        <div className="flex gap-1 px-2 py-2 border-b border-border/60 overflow-x-auto">
          {["all", "unread", "personal", "groups"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFolderChange(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                folder === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
              )}
            >
              {f === "all" ? "همه" : f === "unread" ? "خوانده‌نشده" : f === "personal" ? "شخصی" : "گروه‌ها"}
            </button>
          ))}
        </div>
      )}
      <ul
        className="py-1 flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {sortedChats.map((c) => {
        const name = c.title ?? c.other?.display_name ?? c.other?.username ?? "چت";
        const isActive = activeId === c.id;
        return (
          <li key={c.id}>
            <motion.button
              layout
              transition={spring.soft}
              onClick={() => onSelect(c.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 px-3 py-2.5 text-start",
                "transition-colors duration-150",
                isActive
                  ? "bg-panel-active"
                  : "hover:bg-panel-hover"
              )}
            >
              <div className="relative">
                <Avatar name={name} src={c.other?.avatar_url} size="lg" />
                {c.other?.last_seen_at && new Date(c.other.last_seen_at).getTime() > now - 5 * 60 * 1000 && (
                  <span className="absolute bottom-0 end-0 size-3 rounded-full bg-green-500 ring-2 ring-panel" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate font-semibold text-[15px]",
                      isActive ? "text-foreground" : "text-foreground/90"
                    )}
                  >
                    {name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px] tabular-nums",
                      isActive ? "text-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatChatListTime(c.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-muted-foreground">
                    {c.draft ? (
                      <span className="text-red-500">پیش‌نویس: {c.draft}</span>
                    ) : c.typing ? (
                      <span className="text-primary italic">در حال نوشتن…</span>
                    ) : (
                      c.preview ?? ""
                    )}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.pinned && <span className="text-[11px]">📌</span>}
                    {c.muted && <span className="text-[11px]">🔇</span>}
                    {c.unread && c.unread > 0 ? (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-unread-badge text-[11px] font-semibold text-white grid place-items-center tabular-nums">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {isActive && (
                <motion.span
                  layoutId="chat-active-rail"
                  transition={spring.snappy}
                  className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary"
                />
              )}
            </motion.button>
          </li>
        );
      })}
    </ul>
  </div>
  );
}
