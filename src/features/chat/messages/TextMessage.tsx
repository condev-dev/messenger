"use client";

import type { Message } from "../types";

const URL_RE = /https?:\/\/[^\s<]+/gi;

export function TextMessage({ message }: { message: Message }) {
  const text = typeof message.content.text === "string" ? message.content.text : "";

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    parts.push(
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
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === "string")) {
    return <p className="whitespace-pre-wrap break-words leading-7">{text}</p>;
  }

  return <p className="whitespace-pre-wrap break-words leading-7">{parts}</p>;
}