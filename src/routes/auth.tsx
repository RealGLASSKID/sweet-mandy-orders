import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Sweet Mandy Bakery's" },
      { name: "description", content: "Sign in or create a Sweet Mandy account to place and track orders." },
      { property: "og:title", content: "Sign in — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Sign in to order and track your food." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      nav({ to: "/menu" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone }, emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! Check your email to confirm, then sign in.");
      setMode("in");
    }
  };
  const field = "w-full rounded-xl border bg-card px-4 py-3";
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "up" && (
          <>
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            <input required placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </>
        )}
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-primary">
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
