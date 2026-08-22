import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useProfile, type Profile } from "@/lib/supabase/useProfile";
import { PageTitle, SectionTitle, Eyebrow, HelpText, Card, Breadcrumb, PrimaryButton, SecondaryButton, GhostButton, Badge } from "@/funnel/studio/ui";
import { UserMenu } from "@/funnel/studio/UserMenu";

export const Route = createFileRoute("/studio/admin")({ component: AdminPage });

type ProductRow = { id: string; owner_id: string; data: { name?: string; funnelIds?: string[] }; updated_at: string };
const fmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(iso));

function AdminPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const userId = session.status === "signed-in" ? session.session.user.id : undefined;
  const profileState = useProfile(userId);
  const isAdmin = profileState.status === "ready" && profileState.profile?.role === "admin";

  useEffect(() => {
    if (session.status === "signed-out") void navigate({ to: "/login", search: { redirect: "/studio/admin" } });
    // Only bounce a confirmed non-admin — while session/profile are still loading, userId is briefly
    // undefined and useProfile(undefined) resolves to "ready" with a null profile almost immediately,
    // which used to read as "not an admin" and redirect away before the real data ever loaded.
    else if (session.status === "signed-in" && profileState.status === "ready" && profileState.profile && profileState.profile.role !== "admin")
      void navigate({ to: "/studio" });
  }, [session.status, profileState.status, profileState.status === "ready" ? profileState.profile?.role : undefined, navigate]);

  const [clients, setClients] = useState<Profile[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [clientsResult, productsResult] = await Promise.all([
      supabase.from("profiles").select("id,email,role").order("email"),
      supabase.from("products").select("id,owner_id,data,updated_at").order("updated_at", { ascending: false }),
    ]);
    setClients((clientsResult.data as Profile[] | null) ?? []);
    setProducts((productsResult.data as ProductRow[] | null) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin]);

  if (!isAdmin) {
    return <main className="grid min-h-screen place-items-center bg-studio-bg text-studio-text-muted">Carregando…</main>;
  }

  const createClientAccount = async () => {
    if (!email.trim() || password.length < 8) {
      setError("E-mail e senha (mínimo 8 caracteres) são obrigatórios.");
      return;
    }
    setCreating(true);
    setError("");
    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession();
    const token = sessionData.session?.access_token;
    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const result = await response.json();
    setCreating(false);
    if (!response.ok) {
      setError(result.error || "Não foi possível criar a conta.");
      return;
    }
    setNewClientOpen(false);
    setEmail("");
    setPassword("");
    void reload();
  };

  const deleteClientAccount = async (client: Profile) => {
    if (!confirm(`Excluir a conta de "${client.email}"? Essa ação não pode ser desfeita.`)) return;
    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession();
    const token = sessionData.session?.access_token;
    const response = await fetch(`/api/admin/clients?id=${encodeURIComponent(client.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      alert(result.error || "Não foi possível excluir a conta.");
      return;
    }
    void reload();
  };

  const emailByOwner = new Map(clients.map((client) => [client.id, client.email]));

  return (
    <main className="min-h-screen bg-studio-bg text-studio-text">
      <header className="sticky top-0 z-20 border-b border-studio-border bg-studio-bg/90 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Breadcrumb items={[{ label: "Meus produtos", onClick: () => void navigate({ to: "/studio" }) }, "Administração"]} />
          <div className="flex items-center gap-3">
            <Link to="/studio/roadmap" className="text-sm font-medium text-studio-text-secondary hover:text-studio-text transition-colors">Roadmap</Link>
            <Link to="/studio" className="text-sm font-medium text-studio-text-secondary hover:text-studio-text transition-colors">Voltar</Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Eyebrow>Painel de administração</Eyebrow>
        <PageTitle className="mt-3">Contas e produtos</PageTitle>

        <div className="mt-10 flex items-center justify-between">
          <SectionTitle>Contas de clientes</SectionTitle>
          <PrimaryButton onClick={() => setNewClientOpen(true)}>+ Nova conta</PrimaryButton>
        </div>
        <div className="mt-4 grid gap-2">
          {clients.filter((client) => client.role === "client").map((client) => (
            <Card key={client.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-studio-text">{client.email}</p>
                <Badge tone="neutral">cliente</Badge>
              </div>
              <GhostButton onClick={() => void deleteClientAccount(client)} className="text-studio-error">Excluir</GhostButton>
            </Card>
          ))}
          {!loading && !clients.some((client) => client.role === "client") && (
            <HelpText>Nenhuma conta de cliente criada ainda.</HelpText>
          )}
        </div>

        <div className="mt-12">
          <SectionTitle>Todos os produtos do sistema</SectionTitle>
          <HelpText className="mt-1">{products.length} produtos de {new Set(products.map((product) => product.owner_id)).size} conta(s).</HelpText>
          <div className="mt-4 grid gap-2">
            {products.map((product) => (
              <Card key={product.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-studio-text">{product.data.name || product.id}</p>
                  <p className="mt-0.5 text-xs text-studio-text-muted">
                    {emailByOwner.get(product.owner_id) || product.owner_id} · {product.data.funnelIds?.length ?? 0} funil(is) · atualizado {fmt(product.updated_at)}
                  </p>
                </div>
              </Card>
            ))}
            {!loading && !products.length && <HelpText>Nenhum produto criado ainda.</HelpText>}
          </div>
        </div>
      </section>

      {newClientOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <Card className="w-full max-w-sm bg-studio-surface-2 p-6">
            <SectionTitle>Nova conta de cliente</SectionTitle>
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-studio-text-secondary">
                E-mail
                <input type="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text focus:border-studio-primary/50 focus:outline-none" />
              </label>
              <label className="text-sm text-studio-text-secondary">
                Senha (mínimo 8 caracteres)
                <input type="text" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text focus:border-studio-primary/50 focus:outline-none" />
              </label>
              {error && <p className="text-sm text-studio-error">{error}</p>}
              <div className="flex justify-between pt-2">
                <SecondaryButton onClick={() => { setNewClientOpen(false); setError(""); }}>Cancelar</SecondaryButton>
                <PrimaryButton disabled={creating} onClick={() => void createClientAccount()}>{creating ? "Criando…" : "Criar conta"}</PrimaryButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
