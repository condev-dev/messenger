"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, PenSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { IconButton } from "@/components/ui/icon-button";
import { UserMenu } from "./UserMenu";
import { spring, duration, easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AppShell({
  me,
  sidebar,
  main,
  hasActive,
  onBack,
  onCompose,
}: {
  me: { display_name: string | null; username: string; avatar_url: string | null };
  sidebar: React.ReactNode;
  main: React.ReactNode;
  hasActive: boolean;
  onBack: () => void;
  onCompose: () => void;
}) {
  const r = useRouter();
  const displayName = me.display_name || me.username;

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("خارج شدید");
    r.replace("/login");
  };

  const openSettings = () => r.push("/settings");

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app-bg text-foreground">
      {/* نوار باریک کناری — دسکتاپ */}
      <nav
        aria-label="ناوبری اصلی"
        className="hidden md:flex w-16 shrink-0 flex-col items-center justify-between border-e border-border/70 bg-panel py-3"
      >
        <div className="flex flex-col items-center gap-2">
          <UserMenu
            displayName={displayName}
            username={me.username}
            avatarUrl={me.avatar_url}
            onOpenSettings={openSettings}
            onSignOut={signOut}
          />
          <div className="h-1" />
          <IconButton aria-label="چت‌ها" variant="soft">
            <MessageSquare />
          </IconButton>
        </div>
        <div className="flex flex-col items-center gap-1" />
      </nav>

      {/* لیست چت‌ها */}
      <aside
        className={cn(
          "flex w-full md:w-[340px] lg:w-[380px] shrink-0 flex-col border-e border-border/70 bg-panel",
          hasActive ? "hidden md:flex" : "flex"
        )}
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70">
          <div className="flex items-center gap-2 md:hidden">
            <UserMenu
              displayName={displayName}
              username={me.username}
              avatarUrl={me.avatar_url}
              onOpenSettings={openSettings}
              onSignOut={signOut}
            />
            <span className="text-sm font-semibold truncate">{displayName}</span>
          </div>
          <h1 className="hidden md:block text-base font-bold">چت‌ها</h1>
          <div className="flex items-center gap-1">
            <IconButton aria-label="چت جدید" variant="soft" onClick={onCompose}>
              <PenSquare />
            </IconButton>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
      </aside>

      {/* پنجره‌ی چت */}
      <main
        className={cn(
          "min-w-0 flex-1 bg-chat-bg relative",
          hasActive ? "block" : "hidden md:block"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {hasActive ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0, transition: spring.snappy }}
              exit={{ opacity: 0, x: 12, transition: { duration: duration.fast, ease: easing.out } }}
              className="absolute inset-0"
            >
              {main}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.base }}
              className="absolute inset-0 hidden md:grid place-items-center text-center px-6"
            >
              <div className="max-w-sm">
                <div className="mx-auto mb-4 size-16 rounded-full bg-brand-soft text-brand-strong grid place-items-center">
                  <MessageSquare className="size-7" />
                </div>
                <p className="text-lg font-semibold">یک گفتگو را انتخاب کنید</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  از لیست سمت راست یک چت را باز کنید یا با دکمهٔ «چت جدید» شروع کنید.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* دکمه برگشت موبایل */}
        {hasActive && (
          <button
            onClick={onBack}
            className="md:hidden absolute top-2 end-2 z-10 size-9 grid place-items-center rounded-full bg-panel/90 backdrop-blur border border-border/70"
            aria-label="برگشت"
          >
            <svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
      </main>
    </div>
  );
}
