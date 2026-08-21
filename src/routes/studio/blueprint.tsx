import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureProducts } from "@/funnel/studio/productState";
import { loadFunnel, seedOfficialFunnel } from "@/funnel/studio/studioState";
import { saveGuidedUi } from "@/funnel/studio/guidedState";
import { PRODUCT_VIEW_KEY } from "@/funnel/studio/ProductStudio";
import {
  buildSceneCards,
  assetSummary,
  funnelHealth,
  summaryCounts,
  checkpointsFor,
  blueprintNavTargets,
  editorAvancadoTarget,
  ADVANCED_EDITOR_ROUTE,
  PLANNED_PRODUCTION,
  type SceneCard,
  type SceneCardStatus,
  type AssetOrigin,
  type BlueprintNavTarget,
} from "@/funnel/studio/blueprintData";
import { STORY_MAP } from "@/dev/story-checkpoints";
import type { FunnelDefinition } from "@/funnel/schema/v1";

export const Route = createFileRoute("/studio/blueprint")({ component: StudioBlueprint });

const STATUS_META: Record<SceneCardStatus, { label: string; className: string }> = {
  pronta: { label: "PRONTA", className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30" },
  precisa_testar: { label: "PRECISA TESTAR", className: "bg-amber-500/15 text-amber-400 ring-amber-500/30" },
  em_producao: { label: "EM PRODUÇÃO", className: "bg-blue-500/15 text-blue-400 ring-blue-500/30" },
  com_erro: { label: "COM ERRO", className: "bg-red-500/15 text-red-400 ring-red-500/30" },
};
const ORIGIN_META: Record<AssetOrigin, { label: string; className: string }> = {
  local: { label: "LOCAL", className: "bg-white/[.06] text-zinc-300" },
  r2: { label: "R2", className: "bg-blue-500/10 text-blue-300" },
  cloudinary: { label: "CLOUDINARY", className: "bg-violet-500/10 text-violet-300" },
  permanente: { label: "PERMANENTE", className: "bg-white/[.06] text-zinc-300" },
  faltando: { label: "FALTANDO", className: "bg-red-500/15 text-red-400" },
};

/** Points ProductStudio (via its persisted view + the shared guided-ui state) at the official funnel,
 * then navigates there — reusing the exact same state Studio itself already persists, instead of a
 * parallel navigation mechanism. */
function openInStudio(target: BlueprintNavTarget) {
  localStorage.setItem(PRODUCT_VIEW_KEY, JSON.stringify(target.view));
  saveGuidedUi(target.ui);
}

function StudioBlueprint() {
  // localStorage only exists client-side; loading it in an effect (not useMemo, which also runs during
  // SSR) mirrors the same pattern ProductStudio itself already uses to load its client-only state.
  const [loaded, setLoaded] = useState<{ funnel: FunnelDefinition; productId: string } | null>(null);
  useEffect(() => {
    const official = seedOfficialFunnel(localStorage);
    const products = ensureProducts(localStorage);
    const product = products.find((item) => item.funnelIds.includes(official.id)) || products[0];
    const live = loadFunnel(localStorage, official.id) || official;
    setLoaded({ funnel: live, productId: product?.id || "" });
  }, []);

  if (!loaded) return <main className="min-h-screen bg-[#08090b] p-10 text-white">Carregando blueprint…</main>;
  return <BlueprintView funnel={loaded.funnel} productId={loaded.productId} />;
}

function BlueprintView({ funnel, productId }: { funnel: FunnelDefinition; productId: string }) {
  const cards = useMemo(() => buildSceneCards(funnel), [funnel]);
  const counts = useMemo(() => summaryCounts(funnel), [funnel]);
  const assets = useMemo(() => assetSummary(funnel), [funnel]);
  const health = useMemo(() => funnelHealth(funnel), [funnel]);
  const nav = useMemo(() => blueprintNavTargets(funnel, productId), [funnel, productId]);
  const lastScene = cards.at(-1);
  const lastCheckpoint = STORY_MAP.at(-1);

  const NavLink = ({ label, target }: { label: string; target: BlueprintNavTarget }) => (
    <Link to="/studio" onClick={() => openInStudio(target)} className="rounded-lg border border-white/[.08] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-blue-400/40 hover:text-white transition-colors">
      {label}
    </Link>
  );

  return (
    <main className="min-h-screen bg-[#08090b] text-zinc-100 selection:bg-blue-500/30">
      <header className="border-b border-white/[.06] bg-[#08090b]/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-blue-400">Blueprint do Projeto</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">DESAFIO 14 DIAS <span className="text-zinc-600">/</span> FUNIL PRINCIPAL</h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-500">Mapa completo da experiência, produção e estrutura técnica.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/studio" className="rounded-lg border border-white/[.08] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-blue-400/40 hover:text-white transition-colors">ABRIR STUDIO</Link>
              <NavLink label="ABRIR FUNIL PRINCIPAL" target={nav.funil} />
              <NavLink label="ABRIR ARQUIVOS" target={nav.arquivos} />
              <NavLink label="ABRIR REVISÃO" target={nav.revisao} />
              <Link
                to={ADVANCED_EDITOR_ROUTE}
                onClick={() => saveGuidedUi(editorAvancadoTarget(funnel))}
                className="rounded-lg border border-white/[.08] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-blue-400/40 hover:text-white transition-colors"
              >
                ABRIR EDITOR AVANÇADO
              </Link>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[.07] bg-white/[.06] sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Cenas", counts.scenes],
              ["Interações", counts.interactions],
              ["Assets", counts.assets],
              ["Prontas", counts.ready],
              ["Em produção", counts.inProgress],
              ["Não iniciadas", counts.notStarted],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[#08090b] px-4 py-3.5">
                <div className="text-2xl font-semibold tabular-nums text-white">{value}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 space-y-16">
        {/* STATUS DA PRODUÇÃO */}
        <section>
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[.08] to-transparent p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-blue-400">Status da Produção</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">Última cena integrada</p>
                <p className="mt-1 text-xl font-semibold text-white">{lastScene?.scene.title || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">Último checkpoint</p>
                <p className="mt-1 text-xl font-semibold text-white">{lastCheckpoint?.number} — {lastCheckpoint?.title}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">Próxima cena a produzir</p>
                <p className="mt-1 text-xl font-semibold text-amber-300">{PLANNED_PRODUCTION.title}</p>
                <span className="mt-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/30">Planejada / Não integrada</span>
              </div>
            </div>
          </div>
        </section>

        {/* PRÓXIMA PRODUÇÃO */}
        <section>
          <SectionHeading eyebrow="Próxima produção" title={PLANNED_PRODUCTION.title} />
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{PLANNED_PRODUCTION.objective}</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <div className="space-y-2">
              {PLANNED_PRODUCTION.takes.map((take, index) => (
                <div key={take.id} className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-zinc-600">TAKE {index + 1}</span>
                    {take.character && <span className="text-xs font-semibold text-blue-300">{take.character}</span>}
                  </div>
                  {take.line && <p className="mt-1 text-[15px] text-zinc-100">&ldquo;{take.line}&rdquo;</p>}
                  {take.direction && <p className="mt-1 text-xs italic text-zinc-500">{take.direction}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Personagens</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">{PLANNED_PRODUCTION.characters.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              {PLANNED_PRODUCTION.wardrobe.map((w) => (
                <div key={w.character} className="rounded-xl border border-white/[.07] bg-white/[.025] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Figurino — {w.character}</p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">{w.items.map((item) => <li key={item}>• {item}</li>)}</ul>
                  {w.avoid && <p className="mt-3 text-xs font-semibold text-red-400">{w.avoid}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MAPA NARRATIVO */}
        <section>
          <SectionHeading eyebrow="Mapa narrativo" title="Do início ao fim da produção atual" />
          <div className="flex flex-wrap items-center gap-1.5">
            {STORY_MAP.map((step) => (
              <div key={step.id} className="flex items-center gap-1.5">
                <div className="rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-center">
                  <div className="font-mono text-[10px] text-zinc-600">{step.number}</div>
                  <div className="text-xs font-medium text-zinc-200 whitespace-nowrap">{step.title}</div>
                </div>
                <span className="text-zinc-700">→</span>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[.06] px-3 py-2 text-center">
              <div className="font-mono text-[10px] text-amber-500/70">próxima</div>
              <div className="text-xs font-medium text-amber-300 whitespace-nowrap">{PLANNED_PRODUCTION.title}</div>
            </div>
          </div>
        </section>

        {/* MAPA TÉCNICO POR CENA / GRAFO */}
        <section>
          <SectionHeading eyebrow="Mapa técnico" title="Cada cena, seus eventos e para onde ela leva" />
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => <SceneCardView key={card.scene.id} card={card} />)}
          </div>
        </section>

        {/* ASSETS */}
        <section>
          <SectionHeading eyebrow="Assets" title="O que a narrativa está usando" />
          <div className="grid gap-4 sm:grid-cols-3">
            <AssetGroup title="Vídeos" rows={assets.videos} />
            <AssetGroup title="Áudios" rows={assets.audios} />
            <AssetGroup title="Avatares" rows={assets.images} />
          </div>
        </section>

        {/* SAÚDE DO FUNIL */}
        <section>
          <SectionHeading eyebrow="Diagnóstico" title="Saúde do funil" />
          <div className="grid gap-2 sm:grid-cols-2">
            {health.map((item) => (
              <div key={item.label} className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${item.ok ? "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300" : "border-amber-500/20 bg-amber-500/[.06] text-amber-300"}`}>
                <span>{item.ok ? "✓" : "⚠"}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <details className="mt-4 rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-500">Detalhes técnicos</summary>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-500 sm:grid-cols-4">
              <div>id do funil<div className="font-mono text-zinc-300">{funnel.id}</div></div>
              <div>entrySceneId<div className="font-mono text-zinc-300">{funnel.entrySceneId}</div></div>
              <div>schemaVersion<div className="font-mono text-zinc-300">{funnel.schemaVersion}</div></div>
              <div>exportável<div className="font-mono text-zinc-300">{String(funnel.exportable)}</div></div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-blue-400">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

function SceneCardView({ card }: { card: SceneCard }) {
  const meta = STATUS_META[card.status];
  const checkpoints = card.checkpoints.length ? card.checkpoints : checkpointsFor(card.scene.id);
  return (
    <article className="rounded-2xl border border-white/[.07] bg-white/[.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-zinc-600">CENA {card.index + 1}</p>
          <h3 className="mt-0.5 text-lg font-semibold text-white">{card.scene.title}</h3>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ring-1 ${meta.className}`}>{meta.label}</span>
      </div>
      {checkpoints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {checkpoints.map((cp) => <span key={cp.id} className="rounded bg-white/[.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">{cp.number} {cp.title}</span>)}
        </div>
      )}
      <div className="mt-3 text-xs text-zinc-500">Vídeo: <span className="font-mono text-zinc-300">{card.videoAsset ? card.videoAsset.id : "não anexado"}</span></div>
      {card.interactions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {card.interactions.map((interaction, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-zinc-400">
              <span>{interaction.icon}</span>
              <span><span className="text-zinc-200">{interaction.label}</span> — {interaction.trigger} · {interaction.outcome}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-white/[.06] pt-3 text-xs">
        <span className="text-zinc-500">Saída: <span className="text-zinc-300">{card.exitAction}</span></span>
        <span className="text-zinc-500">→ <span className="text-zinc-300">{card.nextSceneTitle || "fim da produção"}</span></span>
      </div>
      {card.issues.length > 0 && (
        <p className="mt-2 text-xs font-medium text-red-400">{card.issues.length} problema(s) do validador nesta cena.</p>
      )}
    </article>
  );
}

function AssetGroup({ title, rows }: { title: string; rows: { asset: { id: string }; origin: AssetOrigin }[] }) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title} <span className="text-zinc-700">({rows.length})</span></p>
      <ul className="mt-3 space-y-1.5">
        {rows.map(({ asset, origin }) => (
          <li key={asset.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-mono text-zinc-300">{asset.id}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ORIGIN_META[origin].className}`}>{ORIGIN_META[origin].label}</span>
          </li>
        ))}
        {!rows.length && <li className="text-xs text-zinc-600">nenhum</li>}
      </ul>
    </div>
  );
}
