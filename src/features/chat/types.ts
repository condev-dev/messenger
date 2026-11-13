export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  last_seen_at?: string | null;
};

/** محتوای پیام؛ هر تایپ فقط کلیدهای خودش را پر می‌کند (text برای متن، url برای عکس/گیف…) */
export type MessageContent = {
  text?: string;
  url?: string;
  [key: string]: unknown;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  type: string;
  content: MessageContent;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  status?: "sending" | "sent" | "delivered" | "read" | "failed"; // فقط سمت کلاینت
};

/** خلاصه‌ی پیام مورد اشاره (برای نمایش reply preview در حباب) */
export type ReplyRef = {
  id: string;
  sender_id: string;
  sender_name: string;
  preview: string;
  type: string;
};

export type ChatItem = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  last_message_at: string;
  other?: Profile; // برای چت دونفره
  preview?: string; // پیش‌نمایش آخرین پیام
  unread?: number;  // تعداد پیام‌های نخوانده
};
