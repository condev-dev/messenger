"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Save, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/features/chat/hooks/useProfile";
import { Avatar } from "@/components/ui/avatar-smart";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spring, duration } from "@/lib/motion";
import { toast } from "sonner";

export default function SettingsPage() {
  const r = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        r.replace("/login");
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
    })();
  }, [r]);

  if (!userId) {
    return (
      <div className="h-dvh grid place-items-center bg-app-bg">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return <Inner userId={userId} initialEmail={email} />;
}

function Inner({ userId, initialEmail }: { userId: string; initialEmail: string }) {
  const r = useRouter();
  const { profile, loading, update, uploadAvatar } = useProfile(userId);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // تنظیم مقادیر اولیه وقتی profile لود شد (sync قانونی: پراپ خارجی → state فرم)
  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize form from loaded profile
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="h-dvh grid place-items-center bg-app-bg">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const hasChanges =
    displayName !== (profile.display_name ?? "") ||
    username !== profile.username ||
    bio !== (profile.bio ?? "");

  const saveProfile = async () => {
    if (!hasChanges) return;
    setSaving(true);
    const { error } = await update({
      display_name: displayName.trim() || null,
      username: username.trim(),
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("پروفایل ذخیره شد");
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) toast.error(error);
    else toast.success("عکس پروفایل به‌روز شد");
  };

  const sendPasswordReset = async () => {
    if (!initialEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(initialEmail);
    if (error) toast.error(error.message);
    else toast.success("ایمیل بازنشانی رمز ارسال شد");
  };

  const sendChangeEmail = async () => {
    const newEmail = window.prompt("ایمیل جدید را وارد کنید", initialEmail);
    if (!newEmail || newEmail === initialEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else toast.success("ایمیل تایید به آدرس جدید فرستاده شد");
  };

  const name = displayName || username || "کاربر";

  return (
    <div className="min-h-dvh bg-app-bg text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 bg-panel/90 backdrop-blur border-b border-border/70">
        <div className="mx-auto max-w-2xl h-full flex items-center gap-3 px-3">
          <IconButton aria-label="برگشت" onClick={() => r.push("/chat")}>
            <ArrowRight className="rtl:-scale-x-100" />
          </IconButton>
          <h1 className="text-base font-bold">تنظیمات</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* کارت پروفایل */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.snappy}
          className="rounded-2xl bg-panel border border-border/70 p-5 md:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar + دکمه آپلود */}
            <div className="relative">
              <Avatar name={name} src={profile.avatar_url} size="xl" className="size-24 text-2xl" />
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={spring.snappy}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="
                  absolute -bottom-1 -end-1
                  size-9 rounded-full
                  bg-primary text-primary-foreground
                  grid place-items-center shadow-md
                  disabled:opacity-60
                  hover:bg-brand-strong transition-colors
                "
                aria-label="تغییر عکس پروفایل"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </motion.button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {/* فیلدها */}
            <div className="flex-1 w-full space-y-4">
              <Field label="نام نمایشی">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="نام شما"
                  maxLength={40}
                />
              </Field>

              <Field label="نام کاربری" hint="فقط حروف انگلیسی، عدد و خط‌تیره. ۳ تا ۲۰ کاراکتر.">
                <div className="relative">
                  <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="ps-7"
                    placeholder="username"
                    maxLength={20}
                  />
                </div>
              </Field>

              <Field label="درباره من">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  placeholder="یک توضیح کوتاه درباره‌ی خودتان…"
                  className="
                    block w-full resize-none rounded-lg border border-input bg-transparent
                    px-2.5 py-1.5 text-sm outline-none
                    transition-colors
                    placeholder:text-muted-foreground
                    focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
                  "
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-end tabular-nums">
                  {bio.length}/160
                </p>
              </Field>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDisplayName(profile.display_name ?? "");
                setUsername(profile.username);
                setBio(profile.bio ?? "");
              }}
              disabled={!hasChanges || saving}
            >
              لغو تغییرات
            </Button>
            <Button onClick={saveProfile} disabled={!hasChanges || saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              ذخیره
            </Button>
          </div>
        </motion.section>

        {/* کارت حساب */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.snappy, delay: duration.fast }}
          className="rounded-2xl bg-panel border border-border/70 p-5 md:p-6 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-bold text-muted-foreground">حساب</h2>

          <Row
            icon={<Mail className="size-4" />}
            title="ایمیل"
            subtitle={initialEmail}
            action={
              <Button variant="outline" size="sm" onClick={sendChangeEmail}>
                تغییر
              </Button>
            }
          />
          <Row
            icon={<Lock className="size-4" />}
            title="رمز عبور"
            subtitle="برای تغییر رمز، لینک بازنشانی به ایمیل‌تان فرستاده می‌شود"
            action={
              <Button variant="outline" size="sm" onClick={sendPasswordReset}>
                بازنشانی
              </Button>
            }
          />
          <Row
            icon={<UserIcon className="size-4" />}
            title="شناسه"
            subtitle={profile.id}
            mono
          />
        </motion.section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  action,
  mono,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="size-9 rounded-lg bg-brand-soft text-brand-strong grid place-items-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p
          className={`text-[12.5px] text-muted-foreground truncate ${
            mono ? "font-mono text-[11.5px]" : ""
          }`}
        >
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}
