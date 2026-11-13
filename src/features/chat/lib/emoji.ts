// تشخیص اینکه آیا یک متن فقط از ایموجی (با فاصله‌های اختیاری) تشکیل شده
// تا بتونیم مثل تلگرام اون رو بزرگتر و بدون حباب نشون بدیم.
//
// استراتژی:
//  - regex «همه چیز قابل‌پذیرش» می‌سازیم: emoji presentation، modifier، ZWJ، keycaps، regional
//  - فاصله و newline هم مجاز
//  - حداکثر ۳ ایموجی برای نمایش بزرگ

// منابع:
//  - \p{Extended_Pictographic}: کاراکترهای پایه‌ی ایموجی
//  - \p{Emoji_Modifier}: تون پوست
//  - \u200D (ZWJ): چسبنده‌ی ایموجی مرکب (مثل 👨‍👩‍👧)
//  - \uFE0F: VS16 (نمایش ایموجی به‌جای متن)
//  - \u20E3: keycap
//  - \u{1F1E6}-\u{1F1FF}: regional indicators (پرچم)
const EMOJI_ONLY_RE =
  /^(?:\s|\u200D|\uFE0F|\u20E3|[\u{1F1E6}-\u{1F1FF}]|\p{Extended_Pictographic}|\p{Emoji_Modifier})+$/u;

// شمارش «واحد ایموجی» ساده‌شده: با Intl.Segmenter grapheme ها رو می‌شمریم
function countEmojiGraphemes(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // segmenter همیشه در دسترس هست (ES2022+, Chrome/Edge/Safari/FF همه ساپورت)
  try {
    const seg = new Intl.Segmenter("fa", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(trimmed)) {
      void _;
      n++;
      if (n > 5) break;
    }
    return n;
  } catch {
    // fallback ساده
    return [...trimmed].filter((c) => c.trim()).length;
  }
}

/** آیا متن فقط ایموجی است (برای رندر بزرگ)؟ */
export function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (!EMOJI_ONLY_RE.test(t)) return false;
  const n = countEmojiGraphemes(t);
  return n >= 1 && n <= 3;
}

/** کلاس اندازه برای رندر ایموجی بزرگ بر اساس تعداد */
export function emojiJumboClass(text: string): string {
  const n = countEmojiGraphemes(text);
  if (n === 1) return "text-[52px] leading-[1.1]";
  if (n === 2) return "text-[44px] leading-[1.1]";
  return "text-[36px] leading-[1.1]";
}
