"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ۱۲ رنگ ملایم و متمایز برای آواتار بر اساس هش نام کاربر
const PALETTE = [
  "oklch(0.68 0.14 258)", // ایندیگو
  "oklch(0.72 0.13 200)", // فیروزه‌ای
  "oklch(0.72 0.15 150)", // سبز
  "oklch(0.78 0.15 85)",  // زرد
  "oklch(0.72 0.17 40)",  // نارنجی
  "oklch(0.7 0.19 20)",   // قرمز
  "oklch(0.7 0.19 350)",  // صورتی
  "oklch(0.68 0.17 310)", // بنفش
  "oklch(0.65 0.14 275)", // آبی ارغوانی
  "oklch(0.7 0.13 230)",  // آبی
  "oklch(0.72 0.1 170)",  // سبز-آبی
  "oklch(0.75 0.14 110)", // لیمویی
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE_MAP: Record<Size, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};

export function Avatar({
  name,
  src,
  size = "md",
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: Size;
  online?: boolean;
  className?: string;
}) {
  const color = React.useMemo(() => PALETTE[hash(name) % PALETTE.length], [name]);
  const text = React.useMemo(() => initials(name || "?"), [name]);
  const [failed, setFailed] = React.useState(false);
  const showImage = !!src && !failed;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white select-none overflow-hidden",
          SIZE_MAP[size]
        )}
        style={showImage ? undefined : { background: color }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={name}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="leading-none">{text}</span>
        )}
      </span>
      {online !== undefined && (
        <span
          aria-label={online ? "آنلاین" : "آفلاین"}
          className={cn(
            "absolute bottom-0 end-0 block rounded-full ring-2 ring-panel transition-colors",
            size === "xs" || size === "sm" ? "size-2" : "size-2.5",
            online ? "bg-emerald-500" : "bg-transparent"
          )}
        />
      )}
    </span>
  );
}
