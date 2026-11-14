"use client";

import type { Message } from "../types";

export function StickerMessage({ message }: { message: Message }) {
  const c = message.content as { emoji?: string };
  const emoji = typeof c.emoji === "string" ? c.emoji : "😀";
  return (
    <div className="text-6xl leading-none select-none py-1" aria-label="استیکر">
      {emoji}
    </div>
  );
}