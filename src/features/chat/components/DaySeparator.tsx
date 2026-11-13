"use client";

import { motion } from "framer-motion";
import { duration, easing } from "@/lib/motion";

export function DaySeparator({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easing.out }}
      className="sticky top-2 z-10 my-3 flex justify-center pointer-events-none"
    >
      <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-panel/85 backdrop-blur text-muted-foreground shadow-sm border border-border/60">
        {label}
      </span>
    </motion.div>
  );
}
