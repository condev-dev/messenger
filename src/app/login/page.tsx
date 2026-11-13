"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");

  const submit = async () => {
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (res.error) return toast.error(res.error.message);

    // signUp بدون session یعنی «تایید ایمیل» روشنه
    if (mode === "up" && !res.data.session) {
      toast.success("حساب ساخته شد. ایمیل تایید را بررسی کنید.");
      setMode("in");
      return;
    }
    r.push("/chat");
  };

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-background p-6 shadow">
        <h1 className="text-xl font-bold">{mode === "in" ? "ورود" : "ثبت‌نام"}</h1>
        {mode === "up" && <Input placeholder="نام کاربری (انگلیسی)" value={username} onChange={(e) => setUsername(e.target.value)} />}
        <Input type="email" placeholder="ایمیل" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="رمز عبور" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" onClick={submit}>{mode === "in" ? "ورود" : "ساخت حساب"}</Button>
        <button className="text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "حساب ندارید؟ ثبت‌نام" : "حساب دارید؟ ورود"}
        </button>
      </div>
    </main>
  );
}
