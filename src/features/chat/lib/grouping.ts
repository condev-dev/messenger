import type { Message } from "../types";
import { isNewDay } from "@/lib/date";

export type Group = "single" | "first" | "middle" | "last";

// فاصله‌ی زمانی (دقیقه) که اگر بیشتر شد، پیام‌ها نباید گروه بشن
const GROUP_GAP_MIN = 5;

/** محاسبه‌ی جایگاه هر پیام در گروه عمودی برای استایل حباب */
export function groupPosition(
  prev: Message | null,
  curr: Message,
  next: Message | null
): Group {
  const sameSenderPrev =
    prev !== null &&
    prev.sender_id === curr.sender_id &&
    !isNewDay(prev.created_at, curr.created_at) &&
    minutesBetween(prev.created_at, curr.created_at) <= GROUP_GAP_MIN;

  const sameSenderNext =
    next !== null &&
    next.sender_id === curr.sender_id &&
    !isNewDay(curr.created_at, next.created_at) &&
    minutesBetween(curr.created_at, next.created_at) <= GROUP_GAP_MIN;

  if (!sameSenderPrev && !sameSenderNext) return "single";
  if (!sameSenderPrev && sameSenderNext) return "first";
  if (sameSenderPrev && sameSenderNext) return "middle";
  return "last";
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000;
}
