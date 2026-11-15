"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, Info } from "lucide-react";
import { Avatar } from "@/components/ui/avatar-smart";
import { spring } from "@/lib/motion";
import type { Profile } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  title: string;
};

export function InfoPanel({ open, onClose, profile, title }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={spring.snappy}
            className="fixed top-0 end-0 z-50 h-dvh w-full md:w-80 bg-panel border-s border-border/70 flex flex-col shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
              <h2 className="text-base font-bold">اطلاعات</h2>
              <button type="button" onClick={onClose} className="size-8 grid place-items-center rounded-full hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <Avatar name={profile?.display_name ?? profile?.username ?? title} src={profile?.avatar_url ?? null} size="xl" className="size-24 text-2xl" />
                <div className="text-center">
                  <p className="text-lg font-bold">{profile?.display_name ?? profile?.username ?? title}</p>
                  {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                </div>
              </div>
              <div className="space-y-2">
                {profile?.bio && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <Info className="size-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{profile.bio}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent text-start">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-sm">پروفایل</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}