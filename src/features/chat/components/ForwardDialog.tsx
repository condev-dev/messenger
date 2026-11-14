"use client";

import * as React from "react";
import { Forward, X, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar-smart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatItem, Message } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chats: ChatItem[];
  currentChatId?: string | null;
  source: Message | null;
  onConfirm: (destIds: string[], source: Message) => Promise<void> | void;
};

/**
 * دیالوگ هدایت پیام: انتخاب چند چت مقصد + تایید → onConfirm.
 * جستجوی داخلی، multi-select، state loading.
 */
export function ForwardDialog({
  open,
  onOpenChange,
  chats,
  currentChatId,
  source,
  onConfirm,
}: Props) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local state on close
      setQ("");
      setSelected(new Set());
      setBusy(false);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter((c) => {
      const name = (
        c.title ??
        c.other?.display_name ??
        c.other?.username ??
        ""
      ).toLowerCase();
      const uname = (c.other?.username ?? "").toLowerCase();
      return name.includes(term) || uname.includes(term);
    });
  }, [chats, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sourcePreview = React.useMemo(() => {
    if (!source) return "";
    if (source.deleted_at) return "پیام حذف‌شده";
    if (source.type === "text") return String(source.content.text ?? "");
    if (source.type === "image")
      return `🖼 ${String(source.content.caption ?? "عکس")}`;
    if (source.type === "gif") return "🎞 گیف";
    if (source.type === "file")
      return `📎 ${String(source.content.name ?? "فایل")}`;
    return "پیام";
  }, [source]);

  const submit = async () => {
    if (!source || selected.size === 0) return;
    setBusy(true);
    try {
      await onConfirm(Array.from(selected), source);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !p-0 !gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b border-border/70">
          <DialogTitle className="flex items-center gap-2">
            <Forward className="size-5 text-brand-strong" />
            هدایت پیام
          </DialogTitle>
          <DialogDescription className="truncate text-[12px]">
            {sourcePreview.slice(0, 100) || "یک یا چند چت را انتخاب کنید"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2.5 border-b border-border/70">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو بین چت‌ها…"
              className="ps-8"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              چتی یافت نشد
            </p>
          ) : (
            filtered.map((c) => {
              const name =
                c.title ?? c.other?.display_name ?? c.other?.username ?? "چت";
              const checked = selected.has(c.id);
              const isCurrent = currentChatId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-start",
                    "transition-colors",
                    checked ? "bg-brand-soft/60" : "hover:bg-accent"
                  )}
                >
                  <Avatar
                    name={name}
                    src={c.other?.avatar_url ?? null}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {name}
                      {isCurrent && (
                        <span className="ms-1.5 text-[10.5px] text-muted-foreground">
                          (چت فعلی)
                        </span>
                      )}
                    </p>
                    {c.other?.username && (
                      <p
                        className="truncate text-[11.5px] text-muted-foreground"
                        dir="ltr"
                      >
                        @{c.other.username}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "size-5 rounded-full grid place-items-center shrink-0 transition-all",
                      checked
                        ? "bg-primary text-primary-foreground scale-100"
                        : "border border-border scale-90"
                    )}
                  >
                    {checked && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="!m-0 !rounded-none border-t border-border/70 bg-panel/60 p-3 flex items-center !justify-between gap-2">
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {selected.size > 0
              ? `${selected.size.toLocaleString("fa-IR")} چت انتخاب شده`
              : "انتخابی نیست"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              لغو
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={selected.size === 0 || busy}
            >
              <Forward className="size-4" />
              {busy ? "در حال ارسال…" : "ارسال"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
