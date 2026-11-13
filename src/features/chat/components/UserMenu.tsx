"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { menuPop } from "@/lib/motion";
import { Avatar } from "@/components/ui/avatar-smart";

type Props = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

/* ---------- زیرکامپوننت‌های ثابت (خارج از render اصلی) ---------- */

type ItemProps = {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  shortcut?: string;
  trailing?: React.ReactNode;
  closeMenu: () => void;
};

function MenuItem({
  icon,
  label,
  onSelect,
  destructive,
  shortcut,
  trailing,
  closeMenu,
}: ItemProps) {
  return (
    <MenuPrimitive.Item
      onClick={() => {
        onSelect();
        closeMenu();
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm select-none outline-none cursor-default",
        "transition-colors duration-100",
        destructive
          ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
          : "text-foreground hover:bg-accent focus:bg-accent"
      )}
    >
      <span className="size-4 grid place-items-center [&_svg]:size-4 opacity-90">
        {icon}
      </span>
      <span className="flex-1 text-start">{label}</span>
      {shortcut && (
        <span className="text-[11px] text-muted-foreground tabular-nums">{shortcut}</span>
      )}
      {trailing}
    </MenuPrimitive.Item>
  );
}

type ThemeChoiceProps = {
  value: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onSelect: (v: string) => void;
};

function ThemeChoice({ value, icon, label, active, onSelect }: ThemeChoiceProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 py-2 rounded-md text-xs",
        "transition-colors",
        active
          ? "bg-brand-soft text-brand-strong"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      aria-pressed={active}
    >
      <span className="[&_svg]:size-4">{icon}</span>
      {label}
    </button>
  );
}

/* ---------- کامپوننت اصلی ---------- */

export function UserMenu({
  displayName,
  username,
  avatarUrl,
  onOpenSettings,
  onSignOut,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const closeMenu = React.useCallback(() => setOpen(false), []);

  return (
    <MenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <MenuPrimitive.Trigger
        className={cn(
          "rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/60",
          "hover:scale-105 active:scale-95"
        )}
        aria-label="منوی کاربر"
      >
        <Avatar name={displayName} src={avatarUrl} size="md" />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <AnimatePresence>
          {open && (
            <MenuPrimitive.Positioner
              side="inline-end"
              align="start"
              sideOffset={8}
              className="isolate z-50 outline-none"
            >
              <MenuPrimitive.Popup
                render={(popupProps) => (
                  <motion.div
                    {...(popupProps as React.ComponentProps<typeof motion.div>)}
                    variants={menuPop}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className={cn(
                      "min-w-[240px] rounded-xl bg-popover p-1.5 text-popover-foreground",
                      "shadow-lg ring-1 ring-foreground/10 outline-none"
                    )}
                  />
                )}
              >
                {/* Header: پروفایل */}
                <div className="flex items-center gap-3 p-2">
                  <Avatar name={displayName} src={avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="truncate text-[12px] text-muted-foreground">@{username}</p>
                  </div>
                </div>

                <MenuPrimitive.Separator className="my-1 h-px bg-border" />

                <MenuItem
                  icon={<User />}
                  label="پروفایل"
                  onSelect={onOpenSettings}
                  closeMenu={closeMenu}
                />
                <MenuItem
                  icon={<Settings />}
                  label="تنظیمات"
                  onSelect={onOpenSettings}
                  closeMenu={closeMenu}
                />

                <MenuPrimitive.Separator className="my-1 h-px bg-border" />

                {/* Theme selector */}
                <div className="px-1 py-1">
                  <p className="px-1.5 pb-1.5 text-[11px] text-muted-foreground">تم</p>
                  <div className="flex gap-1">
                    <ThemeChoice
                      value="light"
                      icon={<Sun />}
                      label="روشن"
                      active={theme === "light"}
                      onSelect={setTheme}
                    />
                    <ThemeChoice
                      value="dark"
                      icon={<Moon />}
                      label="تیره"
                      active={theme === "dark"}
                      onSelect={setTheme}
                    />
                    <ThemeChoice
                      value="system"
                      icon={<Monitor />}
                      label="سیستم"
                      active={theme === "system"}
                      onSelect={setTheme}
                    />
                  </div>
                </div>

                <MenuPrimitive.Separator className="my-1 h-px bg-border" />

                <MenuItem
                  icon={<LogOut />}
                  label="خروج"
                  onSelect={onSignOut}
                  destructive
                  closeMenu={closeMenu}
                />
              </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
          )}
        </AnimatePresence>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
