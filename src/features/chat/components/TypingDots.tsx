"use client";

import { motion } from "framer-motion";

/**
 * TypingIndicator — سه نقطه‌ی bounce مانند تلگرام
 * داخل متن هدر چت نمایش داده می‌شود
 */
export function TypingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ms-1 align-middle">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.12,
          }}
        />
      ))}
    </span>
  );
}
