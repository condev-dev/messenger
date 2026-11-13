"use client";
import { motion } from "framer-motion";
import { duration, easing } from "@/lib/motion";

/** جداکننده‌ی "پیام‌های جدید" مثل تلگرام — یک نوار subtle با خط دو طرف. */
export function NewMessagesDivider() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: easing.out } }}
      className="my-3 flex items-center gap-2 select-none"
      aria-label="پیام‌های نخوانده از اینجا به بعد"
    >
      <div className="flex-1 h-px bg-primary/25" />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
        پیام‌های جدید
      </div>
      <div className="flex-1 h-px bg-primary/25" />
    </motion.div>
  );
}
