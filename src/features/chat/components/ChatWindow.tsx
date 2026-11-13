"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  Fragment,
  type DragEventHandler,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Phone, Video, Search, MoreVertical, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMessages } from "../hooks/useMessages";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { useTyping } from "../hooks/useTyping";
import { MessageBubble, type BubbleContextInfo } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { DaySeparator } from "./DaySeparator";
import { NewMessagesDivider } from "./NewMessagesDivider";
import { ChatSearch } from "./ChatSearch";
import { MessageContextMenu, type MessageMenuAction } from "./MessageContextMenu";
import { TypingDots } from "./TypingDots";
import { Avatar } from "@/components/ui/avatar-smart";
import { IconButton } from "@/components/ui/icon-button";
import { isNewDay, formatDaySeparator, formatLastSeen } from "@/lib/date";
import { groupPosition } from "../lib/grouping";
import { spring, duration, easing } from "@/lib/motion";
import { mediaContent } from "../lib/media";
import { cn } from "@/lib/utils";
import type { Message, Profile, ReplyRef } from "../types";

export function ChatWindow({
  chatId,
  userId,
  title,
  other,
}: {
  chatId: string;
  userId: string;
  title: string;
  other?: Profile;
}) {
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    send,
    edit,
    remove,
    markRead,
    firstUnreadId,
  } = useMessages(chatId, userId);
  const uploader = useMediaUpload(chatId, userId);
  const { typingUsers, notifyTyping, stopTyping } = useTyping(chatId, userId);

  const otherIsTyping = other ? typingUsers.has(other.id) : typingUsers.size > 0;

  const endRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [atBottom, setAtBottom] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  // snapshot از scrollHeight قبل از prepend برای حفظ موقعیت کاربر هنگام loadMore
  const prevScrollHeight = useRef<number | null>(null);

  // state ریپلای/ویرایش/منو/هایلایت
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [menu, setMenu] = useState<{
    open: boolean;
    anchor: { x: number; y: number } | null;
    message: Message | null;
    mine: boolean;
  }>({ open: false, anchor: null, message: null, mine: false });
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // drag & drop
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  // علامت خواندن وقتی چت باز است و پیام جدید می‌رسد
  useEffect(() => {
    void markRead();
  }, [markRead, messages.length]);

  // اسکرول به پایین در شرایط مناسب
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    const last = messages[messages.length - 1];
    const mine = last?.sender_id === userId;
    if (near || mine) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, userId]);

  // اسکرول اولیه هنگام باز شدن چت:
  // - اگر پیام نخوانده داریم → اسکرول به خط «پیام‌های جدید»
  // - در غیر این صورت → تهِ چت
  const initialScrolledRef = useRef<string | null>(null);
  useEffect(() => {
    // reset هنگام تغییر چت
    initialScrolledRef.current = null;
  }, [chatId]);
  useEffect(() => {
    if (loading) return;
    if (initialScrolledRef.current === chatId) return;
    initialScrolledRef.current = chatId;
    requestAnimationFrame(() => {
      if (firstUnreadId) {
        const el = bubbleRefs.current.get(firstUnreadId);
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "center" });
          return;
        }
      }
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, [loading, chatId, firstUnreadId]);

  // ردیابی «ته بودن» برای نمایش دکمه‌ی پایین
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      setAtBottom(near);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  // Lazy-load پیام‌های قدیمی وقتی sentinel بالا دیده شود
  useEffect(() => {
    const root = boxRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          prevScrollHeight.current = root.scrollHeight;
          void loadMore();
        }
      },
      { root, rootMargin: "120px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  // حفظ موقعیت اسکرول پس از prepend پیام‌های قدیمی
  useEffect(() => {
    const el = boxRef.current;
    if (!el || prevScrollHeight.current === null) return;
    const delta = el.scrollHeight - prevScrollHeight.current;
    if (delta > 0) {
      el.scrollTop += delta;
    }
    prevScrollHeight.current = null;
  }, [messages]);

  // کلیدهای میانبر: Ctrl/⌘+F برای جستجو، Esc برای بستن
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // Helper برای ساخت ReplyRef
  const makeReplyRef = useCallback(
    (m: Message): ReplyRef => {
      const name =
        m.sender_id === userId
          ? "شما"
          : other?.display_name ?? other?.username ?? "کاربر";
      const preview =
        m.deleted_at
          ? "پیام حذف شده"
          : m.type === "text"
          ? String(m.content.text ?? "")
          : m.type === "image"
          ? String(m.content.caption ?? "📷 عکس")
          : m.type === "file"
          ? String(m.content.caption ?? `📎 ${m.content.name ?? "فایل"}`)
          : m.type === "gif"
          ? "GIF"
          : "پیام";
      return {
        id: m.id,
        sender_id: m.sender_id,
        sender_name: name,
        preview: preview.slice(0, 80),
        type: m.type,
      };
    },
    [userId, other]
  );

  // محاسبه لیست item ها با گروه‌بندی و reply ref
  const items = useMemo(() => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    return messages.map((m, i) => ({
      m,
      group: groupPosition(messages[i - 1] ?? null, m, messages[i + 1] ?? null),
      newDay: isNewDay(messages[i - 1]?.created_at ?? null, m.created_at),
      replyRef: m.reply_to_id
        ? (() => {
            const target = byId.get(m.reply_to_id!);
            return target ? makeReplyRef(target) : null;
          })()
        : null,
    }));
  }, [messages, makeReplyRef]);

  const scrollToMessage = useCallback((id: string) => {
    const el = bubbleRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1600);
  }, []);

  const openMenu = (info: BubbleContextInfo) => {
    setMenu({
      open: true,
      anchor: { x: info.x, y: info.y },
      message: info.message,
      mine: info.mine,
    });
  };

  const handleAction = (action: MessageMenuAction) => {
    const m = menu.message;
    if (!m) return;
    if (action === "reply") {
      setReplyTo(makeReplyRef(m));
      setEditing(null);
    } else if (action === "edit") {
      if (m.type !== "text") {
        toast.error("فقط متن قابل ویرایش است");
        return;
      }
      setEditing({ id: m.id, text: String(m.content.text ?? "") });
      setReplyTo(null);
    } else if (action === "copy") {
      const text =
        m.type === "text"
          ? String(m.content.text ?? "")
          : String(m.content.url ?? m.content.caption ?? "");
      void navigator.clipboard.writeText(text).then(
        () => toast.success("کپی شد"),
        () => toast.error("کپی ناموفق")
      );
    } else if (action === "delete") {
      void remove(m.id);
      toast.success("پیام حذف شد");
      if (editing?.id === m.id) setEditing(null);
    }
  };

  // ارسال متن یا رسانه (یا هر دو)
  const handleSend = (text: string, replyToId: string | null) => {
    const ready = uploader.ready;
    const trimmed = text.trim();

    if (ready.length > 0) {
      // هر پیوست یک پیام مستقل است؛ متن به عنوان کپشن روی اولین پیوست می‌چسبد.
      ready.forEach((media, idx) => {
        const type = media.kind === "image" ? "image" : "file";
        const caption = idx === 0 ? trimmed : "";
        void send(type, mediaContent(media, caption || undefined), replyToId);
      });
      uploader.clear();
      setReplyTo(null);
      stopTyping();
      return;
    }

    if (!trimmed) return;
    void send("text", { text: trimmed }, replyToId);
    setReplyTo(null);
    stopTyping();
  };

  // ارسال گیف (از Klipy انتخاب شد)
  const handleSendGif = (gif: import("../lib/klipy").GifItem) => {
    void send(
      "gif",
      {
        url: gif.full,
        preview_url: gif.preview,
        width: gif.width,
        height: gif.height,
        mime_type: "image/gif",
        source: "klipy",
        source_id: gif.id,
      },
      replyTo?.id ?? null
    );
    setReplyTo(null);
    stopTyping();
  };

  const handleEditSave = (text: string) => {
    if (!editing) return;
    void edit(editing.id, text);
    setEditing(null);
  };

  // --- Drag & Drop روی ناحیه‌ی چت ---
  const onDragEnter: DragEventHandler = (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragOver(true);
  };
  const onDragLeave: DragEventHandler = (e) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  };
  const onDragOver: DragEventHandler = (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop: DragEventHandler = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) void uploader.addFiles(files);
  };

  return (
    <div
      className="flex h-full flex-col"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* هدر */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-3 md:px-4 border-b border-border/70 bg-panel/90 backdrop-blur">
        <Avatar name={title || "چت"} src={other?.avatar_url ?? null} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{title || "چت"}</p>
          <p
            className={cn(
              "truncate text-[11px] mt-0.5 transition-colors",
              otherIsTyping ? "text-primary" : "text-muted-foreground"
            )}
          >
            {otherIsTyping ? (
              <span className="inline-flex items-center">
                در حال نوشتن<TypingDots />
              </span>
            ) : other ? (
              formatLastSeen(other.last_seen_at ?? null, false)
            ) : (
              "گفتگو"
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton
            aria-label="جستجو"
            size="sm"
            title="جستجو (Ctrl+F)"
            onClick={() => setSearchOpen((s) => !s)}
            className={cn(searchOpen && "text-primary")}
          >
            <Search />
          </IconButton>
          <IconButton aria-label="تماس صوتی" size="sm" title="تماس (به‌زودی)" disabled>
            <Phone />
          </IconButton>
          <IconButton aria-label="تماس تصویری" size="sm" title="ویدیو (به‌زودی)" disabled>
            <Video />
          </IconButton>
          <IconButton aria-label="بیشتر" size="sm" title="منو (به‌زودی)" disabled>
            <MoreVertical />
          </IconButton>
        </div>
      </header>

      {/* نوار جستجو */}
      <ChatSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        messages={messages}
        onJumpTo={scrollToMessage}
      />

      {/* پیام‌ها */}
      <div ref={boxRef} className="chat-pattern relative min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-3 md:px-4 py-3">
          {/* Sentinel برای infinite scroll */}
          {hasMore && !loading && (
            <div ref={topSentinelRef} className="h-1 w-full" aria-hidden />
          )}

          {loadingMore && (
            <p className="text-center text-xs text-muted-foreground py-3 animate-pulse">
              در حال بارگذاری پیام‌های قدیمی…
            </p>
          )}

          {loading && (
            <p className="text-center text-xs text-muted-foreground py-6">
              در حال بارگذاری…
            </p>
          )}

          {!loading && messages.length === 0 && (
            <div className="grid place-items-center py-16 text-center">
              <div className="rounded-2xl bg-panel/70 backdrop-blur px-5 py-4 text-sm text-muted-foreground border border-border/60 max-w-sm">
                هنوز پیامی رد و بدل نشده. اولین پیام را بفرستید 👋
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {items.map(({ m, group, newDay, replyRef }) => (
              <Fragment key={m.id}>
                {newDay && <DaySeparator label={formatDaySeparator(m.created_at)} />}
                {firstUnreadId === m.id && <NewMessagesDivider />}
                <MessageBubble
                  message={m}
                  mine={m.sender_id === userId}
                  group={group}
                  replyRef={replyRef}
                  highlighted={highlightId === m.id}
                  onContextMenu={openMenu}
                  onReplyClick={scrollToMessage}
                  bubbleRef={(el) => {
                    if (el) bubbleRefs.current.set(m.id, el);
                    else bubbleRefs.current.delete(m.id);
                  }}
                />
              </Fragment>
            ))}
          </AnimatePresence>

          <div ref={endRef} />
        </div>

        {/* دکمه‌ی برو پایین */}
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              key="scroll-down"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={spring.snappy}
              onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
              className={cn(
                "absolute bottom-4 end-4 size-11 rounded-full",
                "bg-panel border border-border shadow-md",
                "grid place-items-center text-foreground",
                "hover:bg-panel-hover transition-colors"
              )}
              aria-label="برو پایین"
            >
              <ChevronDown />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              key="drag"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: duration.fast, ease: easing.out } }}
              exit={{ opacity: 0, transition: { duration: duration.fast } }}
              className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 backdrop-blur-sm grid place-items-center"
            >
              <div className="flex flex-col items-center gap-2 text-primary">
                <Upload className="size-8" />
                <p className="text-sm font-semibold">برای ارسال، اینجا رها کنید</p>
                <p className="text-[11px] opacity-80">تصویر تا ۱۰ مگابایت، فایل تا ۲۵ مگابایت</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChatInput
        onSend={handleSend}
        onEditSave={handleEditSave}
        onEditCancel={() => setEditing(null)}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        attachments={uploader.attachments}
        onPickFiles={(files) => void uploader.addFiles(files)}
        onRemoveAttachment={uploader.remove}
        attachmentsBusy={uploader.isUploading}
        onTyping={notifyTyping}
        onPickGif={handleSendGif}
      />

      <MessageContextMenu
        open={menu.open}
        onOpenChange={(v) => setMenu((s) => ({ ...s, open: v }))}
        anchor={menu.anchor}
        mine={menu.mine}
        canEdit={menu.message?.type === "text" && !menu.message?.deleted_at}
        canDelete={!menu.message?.deleted_at}
        onAction={handleAction}
      />
    </div>
  );
}
