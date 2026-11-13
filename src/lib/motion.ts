// نقطه‌ی مرکزی همه‌ی انیمیشن‌ها. هر کامپوننت از این می‌خونه، نه از عدد سلیقه‌ای.
import type { Transition, Variants } from "framer-motion";

export const easing = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};

export const duration = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  slower: 0.42,
};

export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 28, mass: 0.9 } as Transition,
  snappy: { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as Transition,
  bouncy: { type: "spring", stiffness: 500, damping: 22, mass: 0.8 } as Transition,
};

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: easing.out } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: easing.out } },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, y: 4, transition: { duration: duration.fast } },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.96, transition: { duration: duration.fast } },
};

// ورود حباب پیام — جهت‌دار (خودم / طرف مقابل)
export const bubbleIn = (mine: boolean): Variants => ({
  initial: { opacity: 0, y: 10, scale: 0.96, x: mine ? -6 : 6 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    x: 0,
    transition: spring.snappy,
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: duration.fast } },
});

// ظاهر شدن منوی context / dropdown
export const menuPop: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
  exit: { opacity: 0, scale: 0.98, y: -2, transition: { duration: duration.fast } },
};

// Drawer/Sheet موبایل
export const sheetSlide = (from: "right" | "left" | "bottom"): Variants => {
  if (from === "bottom") {
    return {
      initial: { y: "100%", opacity: 0.8 },
      animate: { y: 0, opacity: 1, transition: spring.soft },
      exit: { y: "100%", opacity: 0.8, transition: { duration: duration.slow, ease: easing.inOut } },
    };
  }
  const value = from === "left" ? "-100%" : "100%";
  return {
    initial: { x: value, opacity: 0.8 },
    animate: { x: 0, opacity: 1, transition: spring.soft },
    exit: { x: value, opacity: 0.8, transition: { duration: duration.slow, ease: easing.inOut } },
  };
};

// stagger container برای لیست‌ها
export const staggerChildren = (stagger = 0.03): Variants => ({
  animate: {
    transition: { staggerChildren: stagger },
  },
});
