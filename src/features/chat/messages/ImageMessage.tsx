"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Message } from "../types";
import { formatBytes } from "../lib/media";
import { duration, easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ImageContent = {
  url?: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  mime_type?: string;
  caption?: string;
};

export function ImageMessage({ message }: { message: Message }) {
  const c = message.content as ImageContent;
  const url = typeof c.url === "string" ? c.url : "";
  const caption = typeof c.caption === "string" ? c.caption : "";
  const name = typeof c.name === "string" ? c.name : "";
  const size = typeof c.size === "number" ? c.size : 0;
  const isGif = message.type === "gif";

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // رزرو فضا با نسبت ابعاد (تا UI نلرزد)
  const w = typeof c.width === "number" ? c.width : 0;
  const h = typeof c.height === "number" ? c.height : 0;
  const aspect = w > 0 && h > 0 ? w / h : 4 / 3;
  const maxW = 320;
  const boxW = maxW;
  const boxH = Math.min(380, Math.round(maxW / aspect));

  if (!url || errored) {
    return (
      <div className="flex items-center gap-2 py-1 text-[13px] opacity-80">
        <span>🖼</span>
        <span>تصویر در دسترس نیست</span>
      </div>
    );
  }

  return (
    <>
      <figure className="-mx-1.5 -mt-0.5 flex flex-col">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className={cn(
            "relative overflow-hidden rounded-xl bg-black/5 dark:bg-white/5",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          )}
          style={{ width: boxW, maxWidth: "100%", height: boxH }}
          aria-label={name ? `بزرگ‌نمایی ${name}` : "بزرگ‌نمایی تصویر"}
        >
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-black/5 dark:bg-white/10" />
          )}
          {/* استفاده از <img> استاندارد چون src به Supabase Storage است */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name || "تصویر"}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />
          {isGif && loaded && (
            <span className="absolute top-1.5 end-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white leading-none backdrop-blur-sm">
              GIF
            </span>
          )}
        </button>
        {(caption || size > 0) && (
          <figcaption className="mt-1 px-1.5">
            {caption && (
              <p className="whitespace-pre-wrap break-words text-[14.5px] leading-6">
                {caption}
              </p>
            )}
            {!caption && size > 0 && (
              <p className="text-[11px] opacity-70">{formatBytes(size)}</p>
            )}
          </figcaption>
        )}
      </figure>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lb"
            role="dialog"
            aria-modal="true"
            aria-label={name || "تصویر"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.base, ease: easing.out } }}
            exit={{ opacity: 0, transition: { duration: duration.fast } }}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/85 backdrop-blur-sm p-4"
            onClick={() => setLightbox(false)}
          >
            <motion.img
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { duration: duration.slow, ease: easing.out } }}
              exit={{ scale: 0.98, opacity: 0, transition: { duration: duration.fast } }}
              src={url}
              alt={name || "تصویر"}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] max-w-[94vw] rounded-lg object-contain shadow-2xl select-none"
            />
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute top-4 end-4 size-10 grid place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition-colors"
              aria-label="بستن"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
