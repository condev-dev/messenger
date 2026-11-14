import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

serve(async (req) => {
  try {
    const { chatId, senderId, messageText } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get chat members except sender
    const { data: members } = await supabase
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", chatId)
      .neq("user_id", senderId);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const userIds = members.map((m: { user_id: string }) => m.user_id);

    // Get push subscriptions for those users
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Send push to each subscription using web-push
    const webpush = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload = JSON.stringify({
      title: "پیام جدید",
      body: messageText ?? "پیام جدید دریافت شد",
      chatId,
    });

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    return new Response(JSON.stringify({ ok: true, results: results.length }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});