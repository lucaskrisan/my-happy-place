import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { FunnelDefinition } from "../schema/v1";
import { createGuidedFunnel, guidedProgress } from "./guidedState";
import { attachFunnel, createProduct, ensureProducts, pinFunnelFirst, type StudioProduct } from "./productState";
import { FunnelStudio } from "./FunnelStudio";
import { loadFunnel, saveFunnel, seedOfficialFunnel } from "./studioState";
import { marinaOfficialFunnel } from "../definitions/marinaOfficialFunnel";

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
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [view, setViewState] = useState<View>({ kind: "home" });
  const [newProduct, setNewProduct] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newFunnel, setNewFunnel] = useState(false);
  const [funnelName, setFunnelName] = useState("");
  const [funnelType, setFunnelType] = useState<(typeof typeOptions)[number][0]>("story");
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
  useEffect(() => {
    reload();
    setViewState(loadView());
  }, []);
  const product = view.kind === "home" ? undefined : products.find((item) => item.id === view.productId);
  const funnels = useMemo(() => (product?.funnelIds.map((id) => loadFunnel(localStorage, id)).filter(Boolean) as FunnelDefinition[] || []) as FunnelDefinition[] & { 0: FunnelDefinition }, [product, products]);
  const primaryFunnel = funnels[0];
  const aggregate = useMemo(() => {
    const scenes = funnels.reduce((sum, funnel) => sum + funnel.scenes.length, 0);
    const interactions = funnels.reduce((sum, funnel) => sum + funnel.scenes.reduce((n, scene) => n + scene.events.length, 0), 0);
    const assets = funnels.reduce((sum, funnel) => sum + funnel.assets.length, 0);
    const ready = funnels.length ? Math.round(funnels.reduce((sum, funnel) => sum + guidedProgress(funnel).percent, 0) / funnels.length) : 0;
    return { scenes, interactions, assets, ready };
  }, [funnels]);
  if (!products.length) return <main className="min-h-screen bg-[#09090b] p-10 text-white">Carregando seus produtos…</main>;
  if (view.kind === "funnel" && product && view.funnelId) return <FunnelStudio productName={product.name} initialFunnelId={view.funnelId} forceGuided onBackToProduct={() => setView({ kind: "product", productId: product.id, tab: "funnels" })} />;

  const create = () => {
    if (!name.trim()) return;
    const created = createProduct(localStorage, name, description);
    reload(); setNewProduct(false); setName(""); setDescription("");
    setView({ kind: "product", productId: created.id, tab: "overview" });
  };
  const createFunnel = () => {
    if (!product || !funnelName.trim()) return;
    const funnel = createGuidedFunnel(funnelType, funnelName.trim(), "", "one");
    saveFunnel(localStorage, funnel);
    attachFunnel(localStorage, product.id, funnel);
    reload(); setNewFunnel(false); setFunnelName("");
    setView({ kind: "funnel", productId: product.id, funnelId: funnel.id });
  };
  return <main className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-blue-500/30">
    <header className="sticky top-0 z-20 border-b border-white/[.06] bg-[#09090b]/85 backdrop-blur px-6 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setView({ kind: "home" })} className="text-sm font-semibold tracking-tight text-white">FUNNEL <span className="text-blue-400">STUDIO</span></button>{view.kind !== "home" && <button onClick={() => setView({ kind: "home" })} className="text-sm text-zinc-400 hover:text-white">Meus produtos</button>}</div>{product && <Link to="/studio/blueprint" className="rounded-lg border border-white/[.08] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-blue-400/40 hover:text-white transition-colors">BLUEPRINT</Link>}</div></header>
    {view.kind === "home" ? <section className="mx-auto max-w-7xl px-6 py-14"><div className="flex items-end justify-between gap-6"><div><p className="mb-3 text-xs font-semibold tracking-[.2em] text-blue-400">SEU ESPAÇO DE CRIAÇÃO</p><h1 className="text-4xl font-semibold tracking-tight text-white">Meus produtos</h1><p className="mt-3 text-lg text-zinc-400">Crie e organize os funis interativos dos seus produtos.</p></div><button onClick={() => setNewProduct(true)} className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">+ NOVO PRODUTO</button></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((item) => { const productFunnels = item.funnelIds.map((id) => loadFunnel(localStorage, id)).filter(Boolean) as FunnelDefinition[]; const sceneCount = productFunnels.reduce((sum, funnel) => sum + funnel.scenes.length, 0); const progress = productFunnels.length ? Math.round(productFunnels.reduce((sum, funnel) => sum + guidedProgress(funnel).percent, 0) / productFunnels.length) : 0; return <article key={item.id} className="rounded-2xl border border-white/[.07] bg-white/[.03] p-6 transition hover:border-blue-400/40 hover:bg-white/[.05]"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 font-semibold text-blue-300">{item.name.slice(0, 1)}</div><span className="text-xs text-zinc-500">Editado {fmt(item.updatedAt)}</span></div><h2 className="mt-7 text-xl font-semibold text-white">{item.name}</h2><p className="mt-2 min-h-10 text-sm text-zinc-400">{item.description || "Organize a experiência e os seus funis."}</p><div className="mt-6 flex gap-4 text-sm text-zinc-400"><span>{productFunnels.length} funil{productFunnels.length === 1 ? "" : "is"}</span><span>{sceneCount} cenas</span><span>{progress}% pronto</span></div><button onClick={() => setView({ kind: "product", productId: item.id, tab: "overview" })} className="mt-7 w-full rounded-lg bg-white/[.08] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">ABRIR PRODUTO</button></article>; })}</div></section> : product && <section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8"><p className="text-sm text-zinc-500">MEUS PRODUTOS / <span className="text-zinc-300">{product.name}</span></p><h1 className="mt-2 text-3xl font-semibold text-white">{product.name}</h1><p className="mt-2 text-zinc-400">{product.description || "Organize os funis e materiais deste produto."}</p></div><nav className="mb-9 flex gap-1 border-b border-white/[.07]">{([['overview','VISÃO GERAL'],['funnels','FUNIS'],['assets','ARQUIVOS'],['publish','PUBLICAÇÃO']] as const).map(([tab, label]) => <button key={tab} onClick={() => setView({ kind: "product", productId: product.id, tab })} className={`border-b-2 px-4 py-3 text-sm font-medium ${view.tab === tab ? "border-blue-400 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>{label}</button>)}</nav>{view.tab === "overview" && <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-7"><p className="text-xs font-semibold tracking-[.18em] text-zinc-500">VISÃO GERAL</p><div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">{[["Funis", funnels.length], ["Cenas", aggregate.scenes], ["Interações", aggregate.interactions], ["Arquivos", aggregate.assets]].map(([label, value]) => <div key={String(label)}><div className="text-2xl font-semibold text-white">{value}</div><div className="mt-1 text-sm text-zinc-500">{label}</div></div>)}</div><div className="mt-8 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${aggregate.ready}%` }} /></div><p className="mt-3 text-sm text-zinc-400">{aggregate.ready}% do produto está pronto para revisão.</p></div><aside className="rounded-2xl bg-blue-500 p-7 text-white"><p className="text-xs font-semibold tracking-[.18em] text-blue-100">PRÓXIMO PASSO</p><h2 className="mt-3 text-xl font-semibold">{funnels.length ? "Continue a criação do seu funil principal." : "Crie o primeiro funil deste produto."}</h2><button onClick={() => funnels[0] ? setView({ kind: "funnel", productId: product.id, funnelId: funnels[0].id }) : setNewFunnel(true)} className="mt-7 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-blue-600">{funnels.length ? "CONTINUAR CRIAÇÃO" : "CRIAR FUNIL"}</button></aside></div>}{view.tab === "funnels" && <div><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold text-white">Funis</h2><p className="mt-1 text-sm text-zinc-500">Cada funil usa a mesma experiência interativa já validada.</p></div><button onClick={() => setNewFunnel(true)} className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold">+ NOVO FUNIL</button></div><div className="grid gap-4">{funnels.map((funnel, index) => { const progress = guidedProgress(funnel); return <article key={funnel.id} className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/[.07] bg-white/[.03] p-6"><div><p className="text-xs font-medium text-blue-400">FUNIL {index === 0 ? "PRINCIPAL" : index + 1}</p><h3 className="mt-1 text-lg font-semibold text-white">{funnel.title}</h3><p className="mt-1 text-sm text-zinc-400">{funnel.guided?.description || "Experiência interativa"}</p><div className="mt-3 flex gap-4 text-sm text-zinc-500"><span>{funnel.scenes.length} cenas</span><span>{progress.percent}% concluído</span><span>{progress.ready === progress.total ? "Pronto" : "Em andamento"}</span></div></div><button onClick={() => setView({ kind: "funnel", productId: product.id, funnelId: funnel.id })} className="rounded-lg bg-white/[.09] px-4 py-3 text-sm font-semibold hover:bg-blue-500">CONTINUAR CRIAÇÃO</button></article>; })}{!funnels.length && <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">Este produto ainda não tem funis.</div>}</div></div>}{view.tab === "assets" && <section className="rounded-2xl border border-white/[.07] bg-white/[.03] p-8"><h2 className="text-xl font-semibold text-white">Arquivos do produto</h2><p className="mt-2 max-w-xl text-zinc-400">Nesta fase, os arquivos continuam sendo organizados dentro de cada funil para não duplicar bibliotecas de mídia.</p>{funnels[0] && <button onClick={() => setView({ kind: "funnel", productId: product.id, funnelId: funnels[0].id })} className="mt-6 rounded-lg bg-white/[.08] px-4 py-3 text-sm font-semibold hover:bg-blue-500">ABRIR ARQUIVOS DO FUNIL PRINCIPAL</button>}</section>}{view.tab === "publish" && <section className="rounded-2xl border border-white/[.07] bg-white/[.03] p-8"><p className="text-xs font-semibold tracking-[.18em] text-blue-400">PUBLICAÇÃO</p><h2 className="mt-3 text-xl font-semibold text-white">Publicação simplificada será configurada na próxima fase.</h2><p className="mt-2 text-zinc-400">Você pode continuar criando e revisando o produto enquanto isso.</p></section>}</section>}
    {newProduct && <Modal title="Qual é o nome do seu produto?" onClose={() => setNewProduct(false)}><label>NOME DO PRODUTO<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Desafio 14 Dias" /></label><label>Descrição opcional<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><button disabled={!name.trim()} onClick={create} className="mt-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold disabled:opacity-40">CRIAR PRODUTO</button></Modal>}
    {newFunnel && <Modal title="O que você quer criar?" onClose={() => setNewFunnel(false)}><div className="grid gap-2">{typeOptions.map(([value, label]) => <button key={value} onClick={() => setFunnelType(value)} className={`rounded-lg border p-3 text-left ${funnelType === value ? "border-blue-400 bg-blue-500/10 text-white" : "border-white/[.08] text-zinc-400"}`}>{label}</button>)}</div><label className="mt-3">Qual é o nome deste funil?<input autoFocus value={funnelName} onChange={(event) => setFunnelName(event.target.value)} placeholder="Ex.: Funil principal" /></label><button disabled={!funnelName.trim()} onClick={createFunnel} className="mt-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold disabled:opacity-40">CRIAR FUNIL</button></Modal>}
  </main>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"><section className="w-full max-w-lg rounded-2xl border border-white/[.1] bg-zinc-950 p-7 shadow-2xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold text-white">{title}</h2><button onClick={onClose} className="text-zinc-500 hover:text-white">Fechar</button></div><div className="grid gap-3 [&_input]:mt-2 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-white/[.1] [&_input]:bg-white/[.04] [&_input]:p-3 [&_textarea]:mt-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-white/[.1] [&_textarea]:bg-white/[.04] [&_textarea]:p-3">{children}</div></section></div>;
}
