"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("ایمیل و رمز را وارد کنید");
      return;
    }
    if (mode === "up" && !username.trim()) {
      toast.error("نام کاربری را وارد کنید");
      return;
    }
    setLoading(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { username } } });
    setLoading(false);
    if (res.error) return toast.error(res.error.message);

    if (mode === "up" && !res.data.session) {
      toast.success("حساب ساخته شد. ایمیل تایید را بررسی کنید.");
      setMode("in");
      return;
    }
    r.push("/chat");
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-app-bg p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* لوگو */}
        <div className="flex flex-col items-center gap-2">
          <div className="size-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <MessageSquare className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">مسنجر</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "in" ? "به حساب خود وارد شوید" : "حساب جدید بسازید"}
          </p>
        </div>

        {/* فرم */}
        <div className="space-y-3 rounded-2xl bg-panel p-6 shadow-sm border border-border/60">
          {mode === "up" && (
            <Input
              placeholder="نام کاربری (انگلیسی)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
            />
          )}
          <Input
            type="email"
            placeholder="ایمیل"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="رمز عبور"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          />
          <Button className="w-full" onClick={() => void submit()} disabled={loading}>
            {loading ? "در حال پردازش…" : mode === "in" ? "ورود" : "ساخت حساب"}
          </Button>
        </div>

        <button
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "حساب ندارید؟ ثبت‌نام" : "حساب دارید؟ ورود"}
        </button>
      </div>
    </main>
  );
}