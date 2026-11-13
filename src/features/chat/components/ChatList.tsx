"use client";

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
}: {
  chats: ChatItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}) {
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
    <ul className="py-1">
      {chats.map((c) => {
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
              <Avatar name={name} src={c.other?.avatar_url} size="lg" />
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
                    {c.preview ?? ""}
                  </p>
                  {c.unread && c.unread > 0 ? (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-unread-badge text-[11px] font-semibold text-white grid place-items-center tabular-nums">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  ) : null}
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
  );
}
