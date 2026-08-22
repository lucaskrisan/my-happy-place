import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { FunnelDefinition } from "../schema/v1";
import { createGuidedFunnel, guidedProgress } from "./guidedState";
import { attachFunnel, createProduct, deleteProduct, ensureProducts, pinFunnelFirst, renameProduct, type StudioProduct } from "./productState";
import { FunnelStudio } from "./FunnelStudio";
import { loadFunnel, saveFunnel, seedOfficialFunnel } from "./studioState";
import { loadGuidedUi } from "./guidedState";
import { PageTitle, SectionTitle, Eyebrow, HelpText, Card, Badge, ProgressBar, Breadcrumb, PrimaryButton, SecondaryButton, GhostButton, EmptyState } from "./ui";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useProfile } from "@/lib/supabase/useProfile";
import { deleteProductFromSupabase, pullFromSupabase, pushAllLocalToSupabase, pushFunnelToSupabase, pushProductsToSupabase } from "@/lib/supabase/sync";

export type View = {
  kind: "home" | "product" | "funnel";
  productId?: string;
  funnelId?: string;
  tab?: "overview" | "funnels" | "assets" | "publish";
};
export const PRODUCT_VIEW_KEY = "funnel-studio:v1:product-view";
const VIEW_KEY = PRODUCT_VIEW_KEY;
const loadView = (): View => {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY) || '{"kind":"home"}');
  } catch {
    return { kind: "home" };
  }
};
const typeOptions = [
  ["story", "História Interativa"], ["vsl", "VSL Interativa"], ["quiz", "Quiz / Diagnóstico"],
  ["gamified", "Funil Gamificado"], ["training", "Treinamento Interativo"], ["blank", "Começar do Zero"],
] as const;
const fmt = (timestamp?: number) => timestamp ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(timestamp) : "agora";

export function ProductStudio() {
  const session = useSupabaseSession();
  const userId = session.status === "signed-in" ? session.session.user.id : undefined;
  const profileState = useProfile(userId);
  const isAdmin = profileState.status === "ready" && profileState.profile?.role === "admin";
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [view, setViewState] = useState<View>({ kind: "home" });
  const [newProduct, setNewProduct] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newFunnel, setNewFunnel] = useState(false);
  const [funnelName, setFunnelName] = useState("");
  const [funnelType, setFunnelType] = useState<(typeof typeOptions)[number][0]>("story");
  const [productMenuOpen, setProductMenuOpen] = useState<string | null>(null);
  const [renamingProduct, setRenamingProduct] = useState<StudioProduct | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  // Persisted so a browser refresh on a product/funnel view does not silently drop back to "Meus produtos".
  const setView = (next: View) => {
    setViewState(next);
    localStorage.setItem(VIEW_KEY, JSON.stringify(next));
  };

  const reload = () => {
    const official = seedOfficialFunnel(localStorage);
    const current = ensureProducts(localStorage);
    const home = current.find((item) => item.name === "DESAFIO 14 DIAS") || current[0];
    if (home) {
      attachFunnel(localStorage, home.id, official);
      pinFunnelFirst(localStorage, home.id, official.id);
    }
    setProducts(ensureProducts(localStorage));
  };
  // Fire-and-forget: pushes localStorage's current product list to Supabase after every local write, so
  // the cloud copy (and, eventually, the super admin panel) stays in step without the UI waiting on it.
  const syncProductsToCloud = () => {
    if (userId) void pushProductsToSupabase(userId, ensureProducts(localStorage));
  };
  useEffect(() => {
    reload();
    setViewState(loadView());
  }, []);
  // Once per login: pull whatever this account already has in the cloud into localStorage (so switching
  // devices/browsers picks up existing work), then push back up anything that was only local until now
  // (e.g. this account's first login, before Supabase was wired in).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void pullFromSupabase(userId).then(() => {
      if (cancelled) return;
      reload();
      void pushAllLocalToSupabase(userId);
    });
    return () => { cancelled = true; };
  }, [userId]);
  const product = view.kind === "home" ? undefined : products.find((item) => item.id === view.productId);
  const funnels = useMemo(() => (product?.funnelIds.map((id) => loadFunnel(localStorage, id)).filter(Boolean) as FunnelDefinition[] || []) as FunnelDefinition[] & { 0: FunnelDefinition }, [product, products]);
  const aggregate = useMemo(() => {
    const scenes = funnels.reduce((sum, funnel) => sum + funnel.scenes.length, 0);
    const interactions = funnels.reduce((sum, funnel) => sum + funnel.scenes.reduce((n, scene) => n + scene.events.length, 0), 0);
    const assets = funnels.reduce((sum, funnel) => sum + funnel.assets.length, 0);
    const ready = funnels.length ? Math.round(funnels.reduce((sum, funnel) => sum + guidedProgress(funnel).percent, 0) / funnels.length) : 0;
    return { scenes, interactions, assets, ready };
  }, [funnels]);
  // Where the person actually left off — read from the same guided-ui state the editor itself persists,
  // so "continue" points at a real place instead of always resetting to the first scene.
  const resume = useMemo(() => {
    const ui = loadGuidedUi();
    if (!ui.funnelId) return null;
    const funnel = loadFunnel(localStorage, ui.funnelId);
    if (!funnel) return null;
    const scene = funnel.scenes.find((item) => item.id === ui.sceneId) || funnel.scenes[0];
    const owner = products.find((item) => item.funnelIds.includes(funnel.id));
    if (!owner) return null;
    return { funnel, scene, productId: owner.id };
  }, [products]);
  if (!products.length) return <main className="min-h-screen bg-studio-bg grid place-items-center text-studio-text-muted">Carregando seus produtos…</main>;
  if (view.kind === "funnel" && product && view.funnelId) return <FunnelStudio productName={product.name} initialFunnelId={view.funnelId} forceGuided onBackToProduct={() => setView({ kind: "product", productId: product.id, tab: "funnels" })} />;

  const create = () => {
    if (!name.trim()) return;
    const created = createProduct(localStorage, name, description);
    reload(); setNewProduct(false); setName(""); setDescription("");
    syncProductsToCloud();
    setView({ kind: "product", productId: created.id, tab: "overview" });
  };
  const createFunnel = () => {
    if (!product || !funnelName.trim()) return;
    const funnel = createGuidedFunnel(funnelType, funnelName.trim(), "", "one");
    saveFunnel(localStorage, funnel);
    attachFunnel(localStorage, product.id, funnel);
    reload(); setNewFunnel(false); setFunnelName("");
    if (userId) void pushFunnelToSupabase(userId, funnel);
    syncProductsToCloud();
    setView({ kind: "funnel", productId: product.id, funnelId: funnel.id });
  };
  const openRename = (item: StudioProduct) => {
    setRenamingProduct(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setProductMenuOpen(null);
  };
  const saveRename = () => {
    if (!renamingProduct || !editName.trim()) return;
    renameProduct(localStorage, renamingProduct.id, editName, editDescription);
    reload();
    syncProductsToCloud();
    setRenamingProduct(null);
  };
  const handleDeleteProduct = (item: StudioProduct) => {
    if (!confirm(`Excluir "${item.name}" e todo o conteúdo dele (funis, cenas, arquivos)? Essa ação não pode ser desfeita.`)) return;
    deleteProduct(localStorage, item.id);
    reload();
    void deleteProductFromSupabase(item.id);
    setProductMenuOpen(null);
  };

  return (
    <main className="min-h-screen bg-studio-bg text-studio-text selection:bg-studio-primary/30">
      <header className="sticky top-0 z-20 border-b border-studio-border bg-studio-bg/90 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          {product ? (
            <Breadcrumb items={[{ label: "Meus produtos", onClick: () => setView({ kind: "home" }) }, product.name]} />
          ) : (
            <span className="text-sm font-semibold tracking-tight">FUNNEL <span className="text-studio-primary">STUDIO</span></span>
          )}
          <div className="flex items-center gap-2">
            {isAdmin && <Link to="/studio/admin" className="rounded-lg border border-studio-border px-3.5 py-1.5 text-xs font-semibold text-studio-text-secondary hover:border-studio-primary/40 hover:text-studio-text transition-colors">Administração</Link>}
            {product && <Link to="/studio/blueprint" className="rounded-lg border border-studio-border px-3.5 py-1.5 text-xs font-semibold text-studio-text-secondary hover:border-studio-primary/40 hover:text-studio-text transition-colors">Blueprint</Link>}
          </div>
        </div>
      </header>

      {view.kind === "home" ? (
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Seu espaço de criação</Eyebrow>
              <PageTitle className="mt-3">Meus produtos</PageTitle>
              <HelpText className="mt-2 text-base">Crie experiências interativas para seus produtos.</HelpText>
            </div>
            <PrimaryButton onClick={() => setNewProduct(true)}>+ Novo produto</PrimaryButton>
          </div>

          {resume && (
            <Card className="mt-10 flex flex-wrap items-center justify-between gap-6 bg-gradient-to-br from-studio-primary-soft to-transparent p-7">
              <div>
                <Eyebrow>Continuar de onde parei</Eyebrow>
                <SectionTitle className="mt-2 text-2xl">{resume.scene?.title || resume.funnel.title}</SectionTitle>
                <HelpText className="mt-1">{resume.funnel.title}</HelpText>
              </div>
              <PrimaryButton onClick={() => setView({ kind: "funnel", productId: resume.productId, funnelId: resume.funnel.id })} className="px-6 py-3">Continuar</PrimaryButton>
            </Card>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((item) => {
              const productFunnels = item.funnelIds.map((id) => loadFunnel(localStorage, id)).filter(Boolean) as FunnelDefinition[];
              const sceneCount = productFunnels.reduce((sum, funnel) => sum + funnel.scenes.length, 0);
              const progress = productFunnels.length ? Math.round(productFunnels.reduce((sum, funnel) => sum + guidedProgress(funnel).percent, 0) / productFunnels.length) : 0;
              const primary = productFunnels[0];
              return (
                <Card key={item.id} className="relative p-6 transition-colors hover:border-studio-primary/40">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-studio-primary-soft font-semibold text-studio-primary-strong">{item.name.slice(0, 1)}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-studio-text-muted">Editado {fmt(item.updatedAt)}</span>
                      <button aria-label="Mais opções deste produto" onClick={() => setProductMenuOpen(productMenuOpen === item.id ? null : item.id)} className="rounded px-1.5 py-0.5 text-studio-text-muted hover:bg-white/[.08] hover:text-studio-text">•••</button>
                    </div>
                  </div>
                  {productMenuOpen === item.id && (
                    <div className="absolute right-4 top-14 z-10 w-36 rounded-lg border border-studio-border bg-studio-surface-2 py-1 shadow-xl">
                      <button onClick={() => openRename(item)} className="block w-full px-3 py-1.5 text-left text-xs text-studio-text-secondary hover:bg-white/[.06]">Renomear</button>
                      <button onClick={() => handleDeleteProduct(item)} className="block w-full px-3 py-1.5 text-left text-xs text-studio-error hover:bg-white/[.06]">Excluir</button>
                    </div>
                  )}
                  <SectionTitle className="mt-6 text-xl">{item.name}</SectionTitle>
                  <HelpText className="mt-1.5 min-h-10">{primary ? primary.title : item.description || "Organize a experiência e os seus funis."}</HelpText>
                  <div className="mt-4 flex items-center gap-4 text-sm text-studio-text-muted">
                    <span>{sceneCount} cenas</span>
                    <span>{progress}% pronto</span>
                  </div>
                  <div className="mt-3"><ProgressBar percent={progress} /></div>
                  <PrimaryButton onClick={() => setView({ kind: "product", productId: item.id, tab: "overview" })} className="mt-6 w-full">Continuar</PrimaryButton>
                </Card>
              );
            })}
          </div>
        </section>
      ) : product && (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-8">
            <PageTitle>{product.name}</PageTitle>
            <HelpText className="mt-2 text-base">{product.description || "Organize os funis e materiais deste produto."}</HelpText>
          </div>
          <nav className="mb-9 flex gap-1 border-b border-studio-border">
            {([["overview", "Visão geral"], ["funnels", "Funis"], ["assets", "Arquivos"], ["publish", "Publicação"]] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setView({ kind: "product", productId: product.id, tab })} className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${view.tab === tab ? "border-studio-primary text-studio-text" : "border-transparent text-studio-text-muted hover:text-studio-text-secondary"}`}>
                {label}
              </button>
            ))}
          </nav>

          {view.tab === "overview" && (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <Card className="p-7">
                <Eyebrow>Visão geral</Eyebrow>
                <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
                  {[["Funis", funnels.length], ["Cenas", aggregate.scenes], ["Interações", aggregate.interactions], ["Arquivos", aggregate.assets]].map(([label, value]) => (
                    <div key={String(label)}>
                      <div className="text-2xl font-semibold text-studio-text tabular-nums">{value}</div>
                      <div className="mt-1 text-sm text-studio-text-muted">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8"><ProgressBar percent={aggregate.ready} /></div>
                <HelpText className="mt-3">{aggregate.ready}% do produto está pronto para revisão.</HelpText>
              </Card>
              <Card className="flex flex-col justify-between bg-gradient-to-br from-studio-primary-soft to-transparent p-7">
                <div>
                  <Eyebrow>Continuar de onde parei</Eyebrow>
                  <SectionTitle className="mt-3 text-xl">{funnels.length ? (funnels[0].title) : "Crie o primeiro funil deste produto."}</SectionTitle>
                </div>
                <PrimaryButton onClick={() => funnels[0] ? setView({ kind: "funnel", productId: product.id, funnelId: funnels[0].id }) : setNewFunnel(true)} className="mt-7">
                  {funnels.length ? "Continuar" : "Criar funil"}
                </PrimaryButton>
              </Card>
            </div>
          )}

          {view.tab === "funnels" && (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <SectionTitle>Funis</SectionTitle>
                  <HelpText className="mt-1">Cada funil usa a mesma experiência interativa já validada.</HelpText>
                </div>
                <SecondaryButton onClick={() => setNewFunnel(true)}>+ Novo funil</SecondaryButton>
              </div>
              <div className="grid gap-4">
                {funnels.map((funnel, index) => {
                  const progress = guidedProgress(funnel);
                  return (
                    <Card key={funnel.id} className="flex flex-wrap items-center justify-between gap-5 p-6">
                      <div>
                        <Badge tone="primary">{index === 0 ? "Funil principal" : `Funil ${index + 1}`}</Badge>
                        <h3 className="mt-2 text-lg font-semibold text-studio-text">{funnel.title}</h3>
                        <HelpText className="mt-1">{funnel.guided?.description || "Experiência interativa"}</HelpText>
                        <div className="mt-3 flex items-center gap-4 text-sm text-studio-text-muted">
                          <span>{funnel.scenes.length} cenas</span>
                          <span>{progress.percent}% concluído</span>
                          <Badge tone={progress.ready === progress.total ? "success" : "neutral"}>{progress.ready === progress.total ? "Pronto" : "Em andamento"}</Badge>
                        </div>
                      </div>
                      <PrimaryButton onClick={() => setView({ kind: "funnel", productId: product.id, funnelId: funnel.id })}>Continuar</PrimaryButton>
                    </Card>
                  );
                })}
                {!funnels.length && <EmptyState title="Este produto ainda não tem funis." action={<PrimaryButton onClick={() => setNewFunnel(true)}>+ Novo funil</PrimaryButton>} />}
              </div>
            </div>
          )}

          {view.tab === "assets" && (
            <Card className="p-8">
              <SectionTitle>Arquivos do produto</SectionTitle>
              <HelpText className="mt-2 max-w-xl">Nesta fase, os arquivos continuam sendo organizados dentro de cada funil para não duplicar bibliotecas de mídia.</HelpText>
              {funnels[0] && <SecondaryButton onClick={() => setView({ kind: "funnel", productId: product.id, funnelId: funnels[0].id })} className="mt-6">Abrir arquivos do funil principal</SecondaryButton>}
            </Card>
          )}

          {view.tab === "publish" && (
            <Card className="p-8">
              <Eyebrow>Publicação</Eyebrow>
              <SectionTitle className="mt-3">Publicação simplificada será configurada na próxima fase.</SectionTitle>
              <HelpText className="mt-2">Você pode continuar criando e revisando o produto enquanto isso.</HelpText>
            </Card>
          )}
        </section>
      )}

      {newProduct && (
        <Modal title="Qual é o nome do seu produto?" onClose={() => setNewProduct(false)}>
          <label>Nome do produto<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Desafio 14 Dias" /></label>
          <label>Descrição opcional<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <PrimaryButton disabled={!name.trim()} onClick={create} className="mt-2 w-full">Criar produto</PrimaryButton>
        </Modal>
      )}
      {newFunnel && (
        <Modal title="O que você quer criar?" onClose={() => setNewFunnel(false)}>
          <div className="grid gap-2">
            {typeOptions.map(([value, label]) => (
              <button key={value} onClick={() => setFunnelType(value)} className={`rounded-lg border p-3 text-left text-sm transition-colors ${funnelType === value ? "border-studio-primary bg-studio-primary-soft text-studio-text" : "border-studio-border text-studio-text-muted hover:border-studio-border-strong"}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="mt-3">Qual é o nome deste funil?<input autoFocus value={funnelName} onChange={(event) => setFunnelName(event.target.value)} placeholder="Ex.: Funil principal" /></label>
          <PrimaryButton disabled={!funnelName.trim()} onClick={createFunnel} className="mt-2 w-full">Criar funil</PrimaryButton>
        </Modal>
      )}
      {renamingProduct && (
        <Modal title="Renomear produto" onClose={() => setRenamingProduct(null)}>
          <label>Nome do produto<input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Ex.: Desafio 14 Dias" /></label>
          <label>Descrição opcional<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label>
          <PrimaryButton disabled={!editName.trim()} onClick={saveRename} className="mt-2 w-full">Salvar</PrimaryButton>
        </Modal>
      )}
    </main>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-studio-surface-2 p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <SectionTitle className="text-xl">{title}</SectionTitle>
          <GhostButton onClick={onClose}>Fechar</GhostButton>
        </div>
        <div className="grid gap-3 text-sm text-studio-text-secondary [&_label]:font-medium [&_input]:mt-2 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-studio-border [&_input]:bg-white/[.04] [&_input]:p-3 [&_input]:text-studio-text [&_input]:font-normal [&_textarea]:mt-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-studio-border [&_textarea]:bg-white/[.04] [&_textarea]:p-3 [&_textarea]:text-studio-text [&_textarea]:font-normal">
          {children}
        </div>
      </Card>
    </div>
  );
}
