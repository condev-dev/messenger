"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "../types";

type UpdateInput = Partial<Pick<Profile, "display_name" | "username" | "bio" | "avatar_url">>;

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!userId);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio,last_seen_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // بارگذاری پروفایل در mount/تغییر userId — sync قانونی با منبع بیرونی (Supabase).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: UpdateInput): Promise<{ error?: string }> => {
      if (!userId) return { error: "no user" };
      // چک یکتایی username اگر در حال تغییره
      if (patch.username) {
        const next = patch.username.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(next)) {
          return { error: "نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط حروف/عدد/خط‌تیره باشد" };
        }
        if (next !== profile?.username) {
          const { data: exists } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", next)
            .maybeSingle();
          if (exists) return { error: "این نام کاربری قبلاً گرفته شده" };
        }
        patch.username = next;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select()
        .single();
      if (error) return { error: error.message };
      setProfile(data as Profile);
      return {};
    },
    [userId, profile?.username]
  );

  /** آپلود آواتار به Storage و برگرداندن URL عمومی */
  const uploadAvatar = useCallback(
    async (file: File): Promise<{ url?: string; error?: string }> => {
      if (!userId) return { error: "no user" };
      if (!file.type.startsWith("image/")) return { error: "فقط فایل تصویر مجاز است" };
      if (file.size > 4 * 1024 * 1024) return { error: "حداکثر حجم ۴ مگابایت است" };

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) return { error: upErr.message };

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      // به‌روزرسانی پروفایل
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) return { error: dbErr.message };

      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      return { url: publicUrl };
    },
    [userId]
  );

  return { profile, loading, reload: load, update, uploadAvatar };
}
