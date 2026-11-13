"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, FileText } from "lucide-react";
import type { PendingAttachment } from "../hooks/useMediaUpload";
import { formatBytes } from "../lib/media";
import { cn } from "@/lib/utils";
import { duration, easing } from "@/lib/motion";

export function AttachmentTray({
  items,
  onRemove,
}: {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1, transition: { duration: duration.base, ease: easing.out } }}
      exit={{ height: 0, opacity: 0, transition: { duration: duration.fast } }}
      className="overflow-hidden"
    >
      <div className="mx-auto max-w-4xl px-3 pt-2">
        <ul className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 6 }}
                transition={{ duration: duration.fast }}
                className={cn(
                  "relative group flex items-center gap-2 rounded-xl border border-border/60",
                  "bg-panel-hover/60 p-1 pe-2",
                  a.status === "error" && "border-red-400/60 bg-red-500/5"
                )}
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-background/80">
                  {a.kind === "image" && a.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.previewUrl}
                      alt={a.file.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <FileText className="size-5" />
                    </div>
                  )}
                  {a.status === "uploading" && (
                    <div className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  )}
                  {a.status === "error" && (
                    <div className="absolute inset-0 grid place-items-center bg-black/35 text-red-200">
                      <AlertCircle className="size-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 max-w-[14ch] leading-tight">
                  <p className="truncate text-[12px] font-medium">{a.file.name}</p>
                  <p className="text-[10.5px] opacity-70 tabular-nums">
                    {a.status === "error"
                      ? a.error ?? "خطا"
                      : a.status === "uploading"
                      ? `در حال آپلود… ${a.progress}٪`
                      : formatBytes(a.file.size)}
                  </p>
                  {a.status === "uploading" && (
                    <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-background/60">
                      <motion.span
                        className="block h-full rounded-full bg-primary"
                        initial={false}
                        animate={{ width: `${Math.max(5, a.progress)}%` }}
                        transition={{ duration: duration.fast }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  className={cn(
                    "absolute -top-1.5 -end-1.5 size-5 rounded-full",
                    "grid place-items-center bg-panel text-foreground",
                    "border border-border shadow-sm",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "focus-visible:opacity-100 focus-visible:outline-none"
                  )}
                  aria-label={`حذف ${a.file.name}`}
                >
                  <X className="size-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </motion.div>
  );
}
