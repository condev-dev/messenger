"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

type Variant = "ghost" | "soft" | "solid";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  ghost: "text-muted-foreground hover:text-foreground hover:bg-panel-hover",
  soft: "text-brand-strong bg-brand-soft hover:bg-brand-soft/80",
  solid: "text-primary-foreground bg-primary hover:bg-brand-strong",
};

const SIZES: Record<Size, string> = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-10 [&_svg]:size-[18px]",
  lg: "size-12 [&_svg]:size-5",
};

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    "aria-label": string;
  }
>(function IconButton({ className, variant = "ghost", size = "md", children, ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.92 }}
      transition={spring.snappy}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full outline-none",
        "transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
});
