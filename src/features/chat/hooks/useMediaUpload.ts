"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  uploadChatMedia,
  validateMediaFile,
  type MediaKind,
  type MediaMetadata,
} from "../lib/media";

export type PendingAttachment = {
  id: string;
  file: File;
  kind: MediaKind;
  /** blob URL برای پیش‌نمایش تصویر (null برای فایل) */
  previewUrl: string | null;
  /** ۰ تا ۱۰۰ */
  progress: number;
  status: "uploading" | "ready" | "error";
  error?: string;
  result?: MediaMetadata;
};

/**
 * صف آپلود پیوست‌ها برای یک چت.
 * هر فایل بلافاصله بعد از انتخاب آپلود می‌شود و در انتها `result` پر می‌شود.
 */
export function useMediaUpload(chatId: string | null, userId: string) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const objectUrls = useRef<string[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const urls = objectUrls.current;
    return () => {
      mounted.current = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.length = 0;
    };
  }, []);

  const patch = useCallback((id: string, next: Partial<PendingAttachment>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...next } : a)));
  }, []);

  const addFiles = useCallback(
    async (files: File[] | FileList | null) => {
      const list = Array.from(files ?? []);
      if (list.length === 0) return;

      for (const file of list) {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

        const validation = validateMediaFile(file);

        if (!validation.kind) {
          setAttachments((prev) => [
            ...prev,
            {
              id,
              file,
              kind: "file",
              previewUrl: null,
              progress: 0,
              status: "error",
              error: validation.error ?? "فایل پشتیبانی نمی‌شود",
            },
          ]);
          continue;
        }

        const kind = validation.kind;
        let previewUrl: string | null = null;
        if (kind === "image" && typeof URL.createObjectURL === "function") {
          previewUrl = URL.createObjectURL(file);
          objectUrls.current.push(previewUrl);
        }

        setAttachments((prev) => [
          ...prev,
          { id, file, kind, previewUrl, progress: 0, status: "uploading" },
        ]);

        if (!chatId) {
          patch(id, { status: "error", error: "ابتدا یک گفتگو را باز کنید" });
          continue;
        }

        const { data, error } = await uploadChatMedia({
          chatId,
          userId,
          file,
          onProgress: (progress) => {
            if (mounted.current) patch(id, { progress });
          },
        });

        if (!mounted.current) return;

        if (error || !data) {
          patch(id, { status: "error", progress: 0, error: error ?? "آپلود ناموفق بود" });
        } else {
          patch(id, { status: "ready", progress: 100, result: data });
        }
      }
    },
    [chatId, userId, patch]
  );

  const remove = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrls.current = objectUrls.current.filter((u) => u !== target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      return [];
    });
    objectUrls.current = [];
  }, []);

  const ready = useMemo(
    () =>
      attachments
        .filter((a) => a.status === "ready" && a.result)
        .map((a) => a.result as MediaMetadata),
    [attachments]
  );

  const isUploading = attachments.some((a) => a.status === "uploading");

  return { attachments, addFiles, remove, clear, ready, isUploading };
}
