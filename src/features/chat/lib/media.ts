import { supabase } from "@/lib/supabase";
import type { MessageContent } from "../types";

/* =========================================================
   محدودیت‌ها و اعتبارسنجی رسانه — هم‌راستا با migration 004
   ========================================================= */

export const MEDIA_BUCKET = "media";
/** سقف حجم تصویر: ۱۰ مگابایت */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** سقف حجم فایل: ۲۵ مگابایت (same as storage.buckets.file_size_limit) */
export const MAX_FILE_BYTES = 26_214_400;

export type MediaKind = "image" | "file";

/** تصاویری که مرورگر مطمئن رندر می‌کند (svg عمداً نیست: خطر XSS) */
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
] as const;

const IMAGE_MIME_SET = new Set<string>(IMAGE_MIME_TYPES);

/** پسوندهای اجرایی/اسکریپتی که آپلودشان بسته است */
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "cpl", "hta",
  "js", "mjs", "cjs", "html", "htm", "xhtml", "svg", "ps1", "vbs", "vbe", "wsf", "jar",
]);

const BLOCKED_MIME_TYPES = new Set([
  "image/svg+xml",
  "text/html",
  "application/xhtml+xml",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-bat",
]);

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "audio/mpeg": "MP3",
  "audio/ogg": "OGG",
  "audio/wav": "WAV",
  "video/mp4": "MP4",
  "video/webm": "WEBM",
  "application/x-rar-compressed": "RAR",
  "application/x-7z-compressed": "7Z",
};

/* =========================================================
   انواع خروجی
   ========================================================= */

export type MediaMetadata = {
  /** مسیر داخل باکت media: <chatId>/<userId>/<uuid>-<safe-name> */
  path: string;
  /** URL عمومی فایل */
  url: string;
  /** نام اصلی فایل (برای نمایش) */
  name: string;
  /** نام امن و نرمال‌شده در storage */
  safe_name: string;
  /** حجم به بایت */
  size: number;
  mime_type: string;
  kind: MediaKind;
  extension: string;
  width?: number;
  height?: number;
  uploaded_at: string;
};

export type MediaValidation = {
  kind: MediaKind | null;
  error?: string;
};

/* =========================================================
   اعتبارسنجی
   ========================================================= */

export function extensionOf(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME_SET.has(mime.toLowerCase());
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "۰ بایت";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const digits = i === 0 ? 0 : value >= 10 ? 0 : 1;
  // اعداد فارسی برای هم‌خوانی با RTL
  return `${value.toFixed(digits).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])} ${units[i]}`;
}

export function mediaKindLabel(media: Pick<MediaMetadata, "kind" | "mime_type" | "extension">): string {
  if (media.kind === "image") return "تصویر";
  const mime = media.mime_type.toLowerCase();
  const label = MIME_LABELS[mime] ?? (media.extension ? media.extension.toUpperCase() : "");
  return label || "فایل";
}

/** اعتبارسنجی حجم + نوع فایل قبل از هر آپلود */
export function validateMediaFile(file: File): MediaValidation {
  if (!(file instanceof File) || file.size <= 0) {
    return { kind: null, error: "فایل خالی یا نامعتبر است" };
  }

  const mime = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name);

  if (BLOCKED_MIME_TYPES.has(mime) || BLOCKED_EXTENSIONS.has(ext)) {
    return { kind: null, error: "این نوع فایل به‌دلیل امنیتی مجاز نیست" };
  }

  if (mime.startsWith("image/")) {
    if (!isImageMime(mime)) {
      return { kind: null, error: "فرمت تصویر پشتیبانی نمی‌شود (PNG، JPG، WEBP، GIF، AVIF یا BMP)" };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { kind: null, error: "حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد" };
    }
    return { kind: "image" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { kind: null, error: "حجم فایل نباید بیشتر از ۲۵ مگابایت باشد" };
  }

  return { kind: "file" };
}

/* =========================================================
   ساخت مسیر و نام امن
   ========================================================= */

/** نام فایل را به [a-z0-9._-] نرمال می‌کند؛ نام فارسی/خالی → file */
export function safeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").trim();
  const dot = base.lastIndexOf(".");
  const rawExt = dot > 0 ? base.slice(dot + 1) : "";
  const ext = /^[a-z0-9]{1,8}$/i.test(rawExt) ? rawExt.toLowerCase() : "";
  const stem =
    (dot > 0 ? base.slice(0, dot) : base)
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-_.]+|[-_.]+$/g, "")
      .slice(0, 48) || "file";
  return ext ? `${stem}.${ext}` : stem;
}

export function buildMediaPath(chatId: string, userId: string, file: File): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${chatId}/${userId}/${uuid}-${safeFileName(file.name)}`;
}

/* =========================================================
   ابعاد تصویر (برای رزرو فضا در UI)
   ========================================================= */

async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      /* fallthrough به روش <img> */
    }
  }

  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/* =========================================================
   آپلود
   ========================================================= */

type UploadArgs = {
  chatId: string;
  userId: string;
  file: File;
  /** ۰ تا ۱۰۰ — مرحله‌ای، چون storage-js رویداد بایتی نمی‌دهد */
  onProgress?: (percent: number) => void;
};

/**
 * آپلود فایل به باکت `media` و برگرداندن URL عمومی + متادیتا.
 *
 * محدودیت شناخته‌شده: `supabase.storage.upload()` رویداد پیشرفت بایتی ندارد،
 * بنابراین پیشرفت در قالب مراحل گزارش می‌شود (اعتبارسنجی → شروع آپلود → پایان آپلود → آماده).
 */
export async function uploadChatMedia({
  chatId,
  userId,
  file,
  onProgress,
}: UploadArgs): Promise<{ data?: MediaMetadata; error?: string }> {
  if (!chatId || !userId) return { error: "چت یا کاربر مشخص نیست" };

  const validation = validateMediaFile(file);
  if (!validation.kind) return { error: validation.error ?? "فایل نامعتبر است" };
  const kind = validation.kind;

  onProgress?.(5);

  const path = buildMediaPath(chatId, userId, file);
  const contentType = file.type || "application/octet-stream";

  onProgress?.(15);
  const dimensions = kind === "image" ? await readImageSize(file) : null;

  onProgress?.(25);
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message || "آپلود ناموفق بود" };
  }

  onProgress?.(90);

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const url = urlData?.publicUrl;
  if (!url) return { error: "ساخت لینک عمومی ناموفق بود" };

  onProgress?.(100);

  const data: MediaMetadata = {
    path,
    url,
    name: file.name || "file",
    safe_name: path.slice(path.lastIndexOf("/") + 1),
    size: file.size,
    mime_type: contentType,
    kind,
    extension: extensionOf(file.name),
    uploaded_at: new Date().toISOString(),
    ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
  };

  return { data };
}

/** ساخت content پیام از نتیجه‌ی آپلود (+ کپشن اختیاری) */
export function mediaContent(media: MediaMetadata, caption?: string): MessageContent {
  const text = caption?.trim();
  return {
    url: media.url,
    path: media.path,
    name: media.name,
    size: media.size,
    mime_type: media.mime_type,
    ...(media.width && media.height ? { width: media.width, height: media.height } : {}),
    ...(text ? { caption: text } : {}),
  };
}
