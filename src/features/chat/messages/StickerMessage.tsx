"use client";

import { useState } from "react";
import type { Message } from "../types";

export function StickerMessage({ message }: { message: Message }) {
  const c = message.content as { emoji?: string; url?: string };
  const url = typeof c.url === "string" ? c.url : "";
  const emoji = typeof c.emoji === "string" ? c.emoji : "";

  const [errored, setErrored] = useState(false);

  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="استیکر"
        className="max-w-[120px] max-h-[120px] object-contain"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className="text-6xl leading-none select-none py-1" aria-label="استیکر">
      {emoji || "😀"}
    </div>
  );
}