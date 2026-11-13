import type { Message } from "../types";
import { emojiJumboClass, isEmojiOnly } from "../lib/emoji";

/**
 * EmojiOnlyMessage — پیام متنی که فقط ایموجی است
 * بزرگ، بدون پس‌زمینه‌ی حباب (در MessageBubble رندر می‌شود)
 */
export function EmojiOnlyMessage({ message }: { message: Message }) {
  const text = String(message.content.text ?? "");
  const cls = emojiJumboClass(text);
  return <p className={`${cls} select-text text-center`}>{text}</p>;
}

export { isEmojiOnly };
