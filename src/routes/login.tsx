import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/supabase/useSession";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({ component: LoginPage, validateSearch: searchSchema });

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const session = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session.status === "signed-in") void navigate({ to: search.redirect || "/studio" });
  }, [session.status, search.redirect, navigate]);
  if (session.status === "signed-in") return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente.");
      return;
    }
    void navigate({ to: search.redirect || "/studio" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-studio-bg px-6 text-studio-text">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-studio-border bg-studio-surface p-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-studio-primary">Funnel Studio</p>
        <h1 className="mt-2 text-xl font-semibold">Entrar</h1>
        <label className="mt-6 block text-sm text-studio-text-secondary">
          E-mail
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none"
          />
        </label>
        <label className="mt-4 block text-sm text-studio-text-secondary">
          Senha
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none"
          />
        </label>
        {error && <p className="mt-3 text-sm text-studio-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-studio-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-studio-primary-strong disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
