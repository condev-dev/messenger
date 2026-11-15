"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Reaction = { emoji: string; count: number; mine: boolean };

export function useReactions(messageId: string | null, userId: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const fetchReactions = useCallback(async () => {
    if (!messageId) return;
    const { data } = await supabase
      .from("message_reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const row of (data ?? []) as { emoji: string; user_id: string }[]) {
      const cur = map.get(row.emoji) ?? { count: 0, mine: false };
      cur.count++;
      if (row.user_id === userId) cur.mine = true;
      map.set(row.emoji, cur);
    }
    setReactions(Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v })));
  }, [messageId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync reactions from DB on mount
    void fetchReactions();
    if (!messageId) return;
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        () => void fetchReactions()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [messageId, fetchReactions]);

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!messageId) return;
      const existing = reactions.find((r) => r.emoji === emoji && r.mine);
      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", userId)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: userId, emoji });
      }
      void fetchReactions();
    },
    [messageId, userId, reactions, fetchReactions]
  );

  return { reactions, toggleReaction };
}