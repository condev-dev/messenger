"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Mic, Smile, Paperclip, X, Reply as ReplyIcon, Pencil, Check, ImagePlay } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { spring, duration, easing } from "@/lib/motion";
import type { ReplyRef } from "../types";
import type { PendingAttachment } from "../hooks/useMediaUpload";
import { AttachmentTray } from "./AttachmentTray";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import type { GifItem } from "../lib/klipy";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string, replyToId: string | null) => void;
  onEditSave?: (text: string) => void;
  onEditCancel?: () => void;
  replyTo?: ReplyRef | null;
  onCancelReply?: () => void;
  editing?: { id: string; text: string } | null;
  disabled?: boolean;
  /* --- پیوست --- */
  attachments?: PendingAttachment[];
  onPickFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  attachmentsBusy?: boolean;
  /* --- تایپینگ --- */
  onTyping?: () => void;
  /* --- GIF --- */
  onPickGif?: (gif: GifItem) => void;
};

export function ChatInput({
  onSend,
  onEditSave,
  onEditCancel,
  replyTo,
  onCancelReply,
  editing,
  disabled,
  attachments = [],
  onPickFiles,
  onRemoveAttachment,
  attachmentsBusy,
  onTyping,
  onPickGif,
}: Props) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiRect, setEmojiRect] = useState<DOMRect | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifRect, setGifRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const gifBtnRef = useRef<HTMLButtonElement>(null);
  const hasText = text.trim().length > 0;
  const isEditing = !!editing;
  const hasAttachments = attachments.length > 0;
  const hasReadyAttachment = attachments.some((a) => a.status === "ready");
  // قابل ارسال اگر: در حال ویرایش و متن داریم، یا متن داریم، یا حداقل یک پیوست آماده
  const canSubmit = isEditing
    ? hasText
    : hasText || hasReadyAttachment;

  useEffect(() => {
    if (editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize text from editing prop
      setText(editing.text);
      requestAnimationFrame(() => {
        ref.current?.focus();
        const el = ref.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      });
    } else {
      setText("");
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const submit = () => {
    if (disabled || !canSubmit) return;
    const t = text.trim();
    if (isEditing) {
      if (!t) return;
      onEditSave?.(t);
    } else {
      // اگر هم پیوست آماده و هم متن داریم: متن به عنوان caption روی رسانه ارسال می‌شود
      // (منطق اصلی در ChatWindow.handleSend پیاده شده)
      onSend(t, replyTo?.id ?? null);
    }
    setText("");
  };

  const cancel = () => {
    if (isEditing) onEditCancel?.();
    else onCancelReply?.();
    setText("");
  };

  const openPicker = () => {
    if (disabled || isEditing) return;
    fileRef.current?.click();
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (isEditing || !onPickFiles) return;
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onPickFiles(files);
    }
  };

  return (
    <div className="border-t border-border/70 bg-panel">
      {/* نوار reply/edit بالای input */}
      <AnimatePresence initial={false}>
        {(replyTo || editing) && (
          <motion.div
            key={editing ? "edit" : "reply"}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: duration.base, ease: easing.out } }}
            exit={{ height: 0, opacity: 0, transition: { duration: duration.fast } }}
            className="overflow-hidden"
          >
            <div className="mx-auto max-w-4xl px-3 pt-2">
              <div
                className={cn(
                  "flex items-stretch gap-2 rounded-lg bg-panel-hover/80 border border-border/60 overflow-hidden"
                )}
              >
                <div
                  className={cn(
                    "w-1 shrink-0",
                    editing ? "bg-amber-500" : "bg-primary"
                  )}
                />
                <div className="py-1.5 pe-2 flex items-center gap-2 flex-1 min-w-0">
                  <span className="grid place-items-center size-7 rounded-md bg-background/60 text-primary">
                    {editing ? <Pencil className="size-3.5" /> : <ReplyIcon className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[11px] font-semibold text-primary">
                      {editing ? "ویرایش پیام" : `پاسخ به ${replyTo?.sender_name ?? ""}`}
                    </p>
                    <p className="truncate text-[12.5px] text-muted-foreground">
                      {editing ? editing.text : replyTo?.preview}
                    </p>
                  </div>
                  <IconButton
                    aria-label="لغو"
                    size="sm"
                    onClick={cancel}
                    className="shrink-0"
                  >
                    <X />
                  </IconButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نوار پیوست‌ها */}
      <AnimatePresence initial={false}>
        {hasAttachments && !isEditing && onRemoveAttachment && (
          <AttachmentTray items={attachments} onRemove={onRemoveAttachment} />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-4xl flex items-end gap-1.5 px-2 py-2">
        <IconButton
          ref={emojiBtnRef}
          aria-label="ایموجی"
          title="ایموجی"
          onClick={() => {
            if (disabled) return;
            const r = emojiBtnRef.current?.getBoundingClientRect() ?? null;
            setEmojiRect(r);
            setEmojiOpen((s) => !s);
          }}
          className={cn(emojiOpen && "text-primary")}
        >
          <Smile />
        </IconButton>

        <EmojiPicker
          open={emojiOpen}
          anchorRect={emojiRect}
          onPick={(emoji) => {
            const el = ref.current;
            const start = el?.selectionStart ?? text.length;
            const end = el?.selectionEnd ?? text.length;
            const next = text.slice(0, start) + emoji + text.slice(end);
            setText(next);
            // بعد از render، cursor رو بعد از ایموجی قرار بده
            requestAnimationFrame(() => {
              if (el) {
                el.focus();
                const pos = start + emoji.length;
                el.setSelectionRange(pos, pos);
              }
            });
            onTyping?.();
          }}
          onClose={() => setEmojiOpen(false)}
        />

        <IconButton
          ref={gifBtnRef}
          aria-label="گیف"
          title="GIF"
          onClick={() => {
            if (disabled || isEditing) return;
            const r = gifBtnRef.current?.getBoundingClientRect() ?? null;
            setGifRect(r);
            setGifOpen((s) => !s);
          }}
          className={cn(gifOpen && "text-primary")}
          disabled={isEditing}
        >
          <ImagePlay />
        </IconButton>

        <GifPicker
          open={gifOpen}
          anchorRect={gifRect}
          onPick={(gif) => {
            setGifOpen(false);
            onPickGif?.(gif);
          }}
          onClose={() => setGifOpen(false)}
        />

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length > 0) onPickFiles?.(list);
            // reset تا انتخاب همان فایل بار دوم هم کار کند
            e.target.value = "";
          }}
        />

        <div className="relative flex-1">
          <textarea
            ref={ref}
            value={text}
            rows={1}
            disabled={disabled}
            placeholder={
              isEditing
                ? "پیام را ویرایش کنید…"
                : hasAttachments
                ? "توضیح (اختیاری)…"
                : "پیام بنویسید…"
            }
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim().length > 0 && !isEditing) onTyping?.();
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="
              block w-full resize-none rounded-2xl bg-muted/70 focus:bg-muted
              px-4 py-2.5 pe-11 text-[15px] leading-6 outline-none
              transition-colors duration-150
              placeholder:text-muted-foreground
              focus-visible:ring-2 focus-visible:ring-ring/50
              disabled:opacity-60 disabled:pointer-events-none
            "
          />
          {!isEditing && (
            <div className="absolute end-1.5 bottom-1.5">
              <IconButton
                aria-label="پیوست"
                title="افزودن عکس یا فایل"
                size="sm"
                onClick={openPicker}
                disabled={disabled || !onPickFiles}
              >
                <Paperclip />
              </IconButton>
            </div>
          )}
        </div>

        <motion.div layout transition={spring.snappy} className="relative">
          <AnimatePresence mode="wait" initial={false}>
            {isEditing ? (
              <motion.div
                key="save"
                initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
                transition={{ duration: duration.fast }}
              >
                <IconButton
                  aria-label="ذخیره‌ی ویرایش"
                  variant="solid"
                  onClick={submit}
                  disabled={disabled || !hasText}
                >
                  <Check />
                </IconButton>
              </motion.div>
            ) : canSubmit ? (
              <motion.div
                key="send"
                initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
                transition={{ duration: duration.fast }}
              >
                <IconButton
                  aria-label="ارسال"
                  variant="solid"
                  onClick={submit}
                  disabled={disabled || attachmentsBusy}
                  title={attachmentsBusy ? "در حال آپلود پیوست…" : undefined}
                >
                  <Send className="rtl:-scale-x-100" />
                </IconButton>
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.6, rotate: 30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: -30 }}
                transition={{ duration: duration.fast }}
              >
                <IconButton aria-label="ضبط صدا (به‌زودی)" disabled>
                  <Mic />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
