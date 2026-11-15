"use client";

import { motion, AnimatePresence } from "framer-motion";
import { duration, easing } from "@/lib/motion";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type Props = {
  open: boolean;
  x: number;
  y: number;
  onReact: (emoji: string) => void;
  onClose: () => void;
};

export function ReactionBar({ open, x, y, onReact, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: duration.fast, ease: easing.out } }}
            exit={{ opacity: 0, scale: 0.8, y: 10, transition: { duration: duration.fast } }}
            className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-popover shadow-lg ring-1 ring-foreground/10"
            style={{ left: Math.max(8, x - 120), top: Math.max(8, y - 50) }}
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onReact(emoji); onClose(); }}
                className="text-xl p-1 rounded-full hover:bg-accent transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}