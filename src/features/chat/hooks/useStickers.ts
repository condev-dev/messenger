"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StickerItem = { id: string; url: string; emoji?: string | null };

export function useStickers(userId: string | null) {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStickers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    // Get stickers from packs owned by this user (and public packs)
    const { data: packs } = await supabase
      .from("sticker_packs")
      .select("id")
      .or(`owner_id.eq.${userId},is_public.eq.true`);
    const packIds = (packs ?? []).map((p: { id: string }) => p.id);
    if (packIds.length === 0) {
      setStickers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("stickers")
      .select("id, url, emoji")
      .in("pack_id", packIds);
    setStickers((data ?? []) as StickerItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchStickers();
  }, [fetchStickers]);

  const uploadSticker = useCallback(
    async (file: File): Promise<boolean> => {
      if (!userId) return false;
      // Ensure a default pack exists
      let packId: string | null = null;
      const { data: existing } = await supabase
        .from("sticker_packs")
        .select("id")
        .eq("owner_id", userId)
        .limit(1)
        .single();
      if (existing) {
        packId = (existing as { id: string }).id;
      } else {
        const { data: created } = await supabase
          .from("sticker_packs")
          .insert({ owner_id: userId, name: "My Stickers", is_public: false })
          .select("id")
          .single();
        packId = (created as { id: string } | null)?.id ?? null;
      }
      if (!packId) return false;

      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("stickers")
        .upload(path, file, { contentType: file.type || "image/png", upsert: false });
      if (uploadError) return false;

      const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(path);
      const { error: insertError } = await supabase.from("stickers").insert({
        pack_id: packId,
        url: urlData.publicUrl,
      });
      if (insertError) return false;

      await fetchStickers();
      return true;
    },
    [userId, fetchStickers]
  );

  return { stickers, loading, uploadSticker, refresh: fetchStickers };
}