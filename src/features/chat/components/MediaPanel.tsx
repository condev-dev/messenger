"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Smile, ImagePlay, Sticker as StickerIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "emoji" | "sticker" | "gif";

type Props = {
  open: boolean;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onClose: () => void;
  children: React.ReactNode;
};

export function MediaPanel({ open, tab, onTabChange, onClose, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-panel rounded-t-2xl max-h-[70vh] flex flex-col"
              ref={containerRef}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/60">
                <div className="flex gap-1">
                  {(["emoji", "sticker", "gif"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTabChange(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-colors",
                        tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )}
                    >
                      {t === "emoji" ? "😊" : t === "sticker" ? "🎨" : "GIF"}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={onClose} className="text-muted-foreground text-lg">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  // Desktop: side panel (right side, fixed)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-16 right-4 z-40 w-80 h-[calc(100vh-5rem)] bg-panel rounded-2xl shadow-2xl ring-1 ring-border/60 flex flex-col overflow-hidden"
          ref={containerRef}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex gap-1">
              {(["emoji", "sticker", "gif"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTabChange(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  {t === "emoji" ? <Smile className="size-4" /> : t === "sticker" ? <StickerIcon className="size-4" /> : <ImagePlay className="size-4" />}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}