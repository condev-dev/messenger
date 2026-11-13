"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Monitor } from "lucide-react";
import { IconButton } from "./icon-button";
import { spring } from "@/lib/motion";

const CYCLE = ["light", "dark", "system"] as const;
type Mode = (typeof CYCLE)[number];

const ICON: Record<Mode, React.ReactNode> = {
  light: <Sun />,
  dark: <Moon />,
  system: <Monitor />,
};
const LABEL: Record<Mode, string> = {
  light: "روشن",
  dark: "تاریک",
  system: "خودکار",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // جلوگیری از hydration mismatch: بعد از mount اجازه رندر کامل میدیم.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <IconButton aria-label="تم" className={className}><Sun /></IconButton>;
  }

  const current = (theme ?? "system") as Mode;
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <IconButton
      aria-label={`تم: ${LABEL[current]} — کلیک برای ${LABEL[next]}`}
      title={LABEL[current]}
      onClick={() => setTheme(next)}
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
          transition={spring.snappy}
          className="inline-flex"
        >
          {ICON[current]}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}
