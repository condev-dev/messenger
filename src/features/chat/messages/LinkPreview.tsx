"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const URL_RE = /https?:\/\/[^\s<]+/i;

export function LinkPreview({ text }: { text: string }) {
  const match = text.match(URL_RE);
  const url = match ? match[0] : null;

  if (!url) return null;

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-1.5 rounded-lg border border-border/60 bg-muted/50 overflow-hidden hover:bg-muted transition-colors"
    >
      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground truncate">{hostname}</p>
        <p className="text-sm text-primary truncate underline">{url}</p>
      </div>
    </a>
  );
}