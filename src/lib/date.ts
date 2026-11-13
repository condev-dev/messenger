import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInMinutes,
} from "date-fns-jalali";

/** فرمت زمان کوتاه (ساعت:دقیقه) برای حباب پیام */
export function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** جداکننده‌ی روز بالای پیام: امروز / دیروز / نام روز / تاریخ */
export function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "امروز";
  if (isYesterday(d)) return "دیروز";
  if (isThisWeek(d, { weekStartsOn: 6 })) return format(d, "EEEE");
  if (isThisYear(d)) return format(d, "d MMMM");
  return format(d, "d MMMM yyyy");
}

/** زمان لیست چت‌ها (مثل تلگرام): امروز HH:mm / دیروز / روز هفته / d MMM */
export function formatChatListTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "دیروز";
  if (isThisWeek(d, { weekStartsOn: 6 })) return format(d, "EEEE");
  if (isThisYear(d)) return format(d, "d MMM");
  return format(d, "yyyy/MM/dd");
}

/** آخرین بازدید: «آنلاین» / «همین الان» / «n دقیقه پیش» / تاریخ */
export function formatLastSeen(iso: string | null, online: boolean): string {
  if (online) return "آنلاین";
  if (!iso) return "اخیراً";
  const d = new Date(iso);
  const mins = differenceInMinutes(new Date(), d);
  if (mins < 1) return "همین الان";
  if (mins < 60) return `${mins} دقیقه پیش`;
  if (isToday(d)) return `امروز ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `دیروز ${format(d, "HH:mm")}`;
  if (isThisYear(d)) return format(d, "d MMMM");
  return format(d, "d MMMM yyyy");
}

/** آیا دو پیام باید یک جداکننده‌ی روز بینشون داشته باشن؟ */
export function isNewDay(prevIso: string | null, currIso: string): boolean {
  if (!prevIso) return true;
  const a = new Date(prevIso);
  const b = new Date(currIso);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}
