"use client";

import { useState } from "react";
import { PenSquare, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NewChatDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (chatId: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const q = username.trim().replace(/^@/, "");
    if (!q) return;
    setBusy(true);
    try {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", q)
        .maybeSingle();
      if (!p) {
        toast.error("کاربری با این نام یافت نشد");
        return;
      }
      const { data: cid, error } = await supabase.rpc("create_direct_chat", { other: p.id });
      if (error) {
        toast.error("خطا در ساخت چت");
        return;
      }
      setUsername("");
      onOpenChange(false);
      onCreated(cid as string);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenSquare className="size-5 text-brand-strong" />
            چت جدید
          </DialogTitle>
          <DialogDescription>
            نام کاربری طرف مقابل را وارد کنید. اگر هنوز حسابی ندارد، باید اول ثبت‌نام کند.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            dir="ltr"
            autoFocus
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
            className="ps-9"
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={start} disabled={busy || !username.trim()}>
            {busy ? "در حال باز کردن…" : "شروع گفتگو"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
