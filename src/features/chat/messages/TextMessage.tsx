"use client";

import type { Message } from "../types";
import { cn } from "@/lib/utils";

const URL_RE = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;

export function TextMessage({ message }: { message: Message }) {
  const text = typeof message.content.text === "string" ? message.content.text : "";
  const parts = text.split(URL_RE);
  const matches = text.match(URL_RE) ?? [];

  if (matches.length === 0) {
    return <p className="whitespace-pre-wrap break-words leading-7">{text}</p>;
  }

  // Rebuild with links
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  const regex = new RegExp(URL_RE.source, "gi");
  let m: RegExpExecArray | null;
  let pos = 0;
  const result: React.ReactNode[] = [];
  let lastEnd = 0;

  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastEnd) {
      result.push(text.slice(lastEnd, m.index));
    }
    result.push(
      <a
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all"
      >
        {m[0]}
      </a>
    );
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) {
    result.push(text.slice(lastEnd));
  }

  return <p className="whitespace-pre-wrap break-words leading-7">{result}</p>;
}