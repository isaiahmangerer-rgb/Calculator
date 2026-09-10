"use client";

import { ArrowRight, AtSign, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { displayNameSchema, usernameSchema } from "@/lib/schemas";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter(); const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!supabase) { setMessage("Supabase is not configured yet. Add the public URL and anon key to continue."); return; }
    const form = new FormData(event.currentTarget); const email = String(form.get("email")); const password = String(form.get("password"));
    setBusy(true);
    if (mode === "sign-up") {
      const username = usernameSchema.safeParse(form.get("username")); const displayName = displayNameSchema.safeParse(form.get("displayName"));
      if (!username.success || !displayName.success) { setMessage(username.error?.issues[0]?.message || displayName.error?.issues[0]?.message || "Check your profile details."); setBusy(false); return; }
      const { data: current } = await supabase.auth.getUser();
      if (current.user?.is_anonymous) await supabase.auth.signOut();
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { username: username.data, display_name: displayName.data }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile` } });
      setMessage(error?.message || "Check your email to confirm your Nexus account.");
    } else {
      const { data: current } = await supabase.auth.getUser();
      if (current.user?.is_anonymous) await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else { router.push("/rooms/general"); router.refresh(); }
    }
    setBusy(false);
  }
  return <form className="auth-form" onSubmit={submit}>{mode === "sign-up" && <><label><span>Display name</span><div><UserRound size={17} /><input name="displayName" required maxLength={50} autoComplete="name" placeholder="Maya Chen" /></div></label><label><span>Username</span><div><AtSign size={17} /><input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoComplete="username" placeholder="mayac" /></div></label></>}<label><span>Email</span><div><Mail size={17} /><input type="email" name="email" required autoComplete="email" placeholder="you@example.com" /></div></label><label><span>Password</span><div><LockKeyhole size={17} /><input type="password" name="password" required minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder="At least 8 characters" /></div></label>{message && <p className="form-message" role="status">{message}</p>}<button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}<ArrowRight size={17} /></button></form>;
}
