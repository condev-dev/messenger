"use client";

import { createElement } from "react";
import { Download, FileText, FileSpreadsheet, FileArchive, FileAudio, FileVideo, File as FileIcon } from "lucide-react";
import type { Message } from "../types";
import { formatBytes, mediaKindLabel } from "../lib/media";
import { cn } from "@/lib/utils";

type FileContent = {
  url?: string;
  name?: string;
  size?: number;
  mime_type?: string;
  caption?: string;
};

function pickIcon(mime: string) {
  const m = mime.toLowerCase();
  if (m.startsWith("audio/")) return FileAudio;
  if (m.startsWith("video/")) return FileVideo;
  if (m === "application/zip" || m === "application/x-rar-compressed" || m === "application/x-7z-compressed") return FileArchive;
  if (
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    m === "text/csv"
  )
    return FileSpreadsheet;
  if (
    m === "application/pdf" ||
    m === "text/plain" ||
    m === "application/msword" ||
    m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return FileText;
  return FileIcon;
}

export function FileMessage({ message }: { message: Message }) {
  const c = message.content as FileContent;
  const url = typeof c.url === "string" ? c.url : "";
  const name = typeof c.name === "string" ? c.name : "فایل";
  const size = typeof c.size === "number" ? c.size : 0;
  const mime = typeof c.mime_type === "string" ? c.mime_type : "";
  const caption = typeof c.caption === "string" ? c.caption : "";
  const iconComp = pickIcon(mime);
  const label = mediaKindLabel({ kind: "file", mime_type: mime, extension: "" });

  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={url || "#"}
        download={name}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-2 py-1.5 -mx-1 min-w-0",
          "transition-colors duration-150",
          "hover:bg-black/5 dark:hover:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          {createElement(iconComp, { className: "size-5" })}
        </span>
        <span className="min-w-0 flex-1 text-start">
          <span className="block truncate text-[13.5px] font-medium">{name}</span>
          <span className="block text-[11px] opacity-70 tabular-nums">
            {label} {size > 0 ? `• ${formatBytes(size)}` : ""}
          </span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
      </a>
      {caption && (
        <p className="whitespace-pre-wrap break-words text-[14.5px] leading-6 px-1">
          {caption}
        </p>
      )}
    </div>
  );
}
