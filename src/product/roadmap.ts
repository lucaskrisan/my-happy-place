/**
 * Single source of truth for product/platform status.
 *
 * This is the ONLY place task status lives — not a second .md file, not a .json file. Docs (see
 * docs/ROADMAP_PROTOCOL.md) explain the *process*; this file holds the *data*. `/studio/roadmap`
 * (internal, admin-only) and `/roadmap` (public, sanitized) both render straight from `ROADMAP` below.
 *
 * Rule: a task only becomes DONE when its acceptanceCriteria are actually satisfied and there is real
 * evidence (a commit, passing tests, a deploy) — never because code was written that "should" satisfy it.
 * See docs/ROADMAP_PROTOCOL.md before touching this file.
 */

export type RoadmapStatus = "DONE" | "IN_PROGRESS" | "NEXT" | "TODO" | "BLOCKED" | "PAUSED";
export type RoadmapPriority = "NOW" | "HIGH" | "MEDIUM" | "LOW";
/** CORE = tracked as part of this repo's technical progress. EXTERNAL = lives in a different project/repo entirely (e.g. the marketing site) and never counts toward CORE completion. */
export type RoadmapScope = "CORE" | "EXTERNAL";
export type RoadmapCategory =
  | "Studio" | "Billing" | "Academy" | "Publishing" | "Domains" | "Admin"
  | "Analytics" | "Interactions" | "Agency" | "Marketing" | "External" | "Roadmap";

export type RoadmapEvidence = {
  commit?: string;
  branch?: string;
  tests?: string;
  typecheck?: string;
  build?: string;
  deployStatus?: string;
  deployUrl?: string;
  completedAt?: string;
  notes?: string;
};

export type RoadmapTask = {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  /** What a non-technical/external reader sees on /roadmap. Falls back to `title` if omitted. */
  publicDescription?: string;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  scope: RoadmapScope;
  dependencies: string[];
  acceptanceCriteria: string[];
  /** Never sent to /roadmap — admin-eyes-only context (why blocked, risk notes, etc). */
  internalNotes?: string;
  evidence: RoadmapEvidence;
};

export type RoadmapPhase = {
  id: string;
  name: string;
  description: string;
  category: RoadmapCategory;
};

export type Roadmap = {
  productName: string;
  tagline: string;
  category: string;
  conceptMessage: string;
  phases: RoadmapPhase[];
  tasks: RoadmapTask[];
};

function phase(id: string, name: string, description: string, category: RoadmapCategory): RoadmapPhase {
  return { id, name, description, category };
}

function task(
  id: string,
  phaseId: string,
  title: string,
  opts: {
    description?: string;
    publicDescription?: string;
    status?: RoadmapStatus;
    priority?: RoadmapPriority;
    scope?: RoadmapScope;
    dependencies?: string[];
    acceptanceCriteria?: string[];
    internalNotes?: string;
    evidence?: RoadmapEvidence;
  } = {},
): RoadmapTask {
  return {
    id,
    phaseId,
    title,
    description: opts.description ?? title,
    status: opts.status ?? "TODO",
    priority: opts.priority ?? "MEDIUM",
    scope: opts.scope ?? "CORE",
    dependencies: opts.dependencies ?? [],
    acceptanceCriteria: opts.acceptanceCriteria ?? [],
    evidence: opts.evidence ?? {},
    ...(opts.publicDescription !== undefined ? { publicDescription: opts.publicDescription } : {}),
    ...(opts.internalNotes !== undefined ? { internalNotes: opts.internalNotes } : {}),
  };
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

const PHASES: RoadmapPhase[] = [
  phase("FASE-0", "Fundação existente", "Tudo que já foi construído antes do roadmap operacional existir.", "Studio"),
  phase("FASE-1", "Roadmap operacional", "Fonte única de verdade sobre o produto — esta própria estrutura.", "Roadmap"),
  phase("FASE-2", "Planos / Entitlements", "Modelo comercial (planos, quotas, acesso) — ainda não implementado.", "Billing"),
  phase("FASE-3", "Academy / Members", "Área de aulas dentro do SaaS, incluída nos planos pagos.", "Academy"),
  phase("FASE-4", "Publicação core", "Publicar um funil como versão imutável servida no edge, sem Supabase no hot path.", "Publishing"),
  phase("FASE-5", "CTA externo", "Bloco genérico de link/CTA externo — não somos checkout do cliente.", "Publishing"),
  phase("FASE-6", "Domínios personalizados", "Cliente conecta um subdomínio próprio sem tocar em Cloudflare.", "Domains"),
  phase("FASE-7", "Onboarding", "Ativação guiada até a primeira experiência publicada.", "Studio"),
  phase("FASE-8", "Templates", "Galeria de funis prontos para clonar.", "Studio"),
  phase("FASE-9", "CEO Control Center", "Cockpit operacional completo em /studio/admin.", "Admin"),
  phase("FASE-10", "Analytics / Metering", "Eventos de uso no edge, de forma assíncrona, sem travar o visitante.", "Analytics"),
  phase("FASE-11", "Personalização / Memória", "Variáveis, respostas persistidas, copy e ramificação condicional.", "Interactions"),
  phase("FASE-12", "Interações 2.0", "Novos blocos de interação além dos já existentes.", "Interactions"),
  phase("FASE-13", "Integrações de marketing", "UTMs, pixels, webhooks de saída, CRMs.", "Analytics"),
  phase("FASE-14", "Atribuição de compra", "Ligar clique no CTA externo à compra, sem processar pagamento.", "Analytics"),
  phase("FASE-15", "Agency / Times", "Workspaces multi-cliente para agências.", "Agency"),
  phase("FASE-16", "Marketplace", "Templates pagos de terceiros — só depois de validar o resto.", "Agency"),
  phase("FASE-EXT", "Projetos externos", "Trabalho que não vive neste repositório.", "External"),
];

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

const TASKS: RoadmapTask[] = [
  // ---- FASE 0 — Fundação existente (auditada via git log + leitura de código em 2026-08-22) --------
  task("FOUND-001", "FASE-0", "Cloudflare Worker (runtime da aplicação)", {
    description: "src/server.ts como fetch handler; wrangler.jsonc configurado (binding R2, compatibility flags).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["Worker deployado e respondendo em produção"],
    evidence: { notes: "Confirmado via wrangler deployments list — deploys ativos em produção." },
  }),
  task("FOUND-002", "FASE-0", "CI/CD (GitHub Actions → Cloudflare)", {
    description: ".github/workflows/deploy-cloudflare.yml roda typecheck, build e wrangler deploy a cada push em main.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["Push em main dispara deploy automático", "Pipeline roda typecheck e build antes do deploy"],
    evidence: { notes: "Última execução (Fix Stripe subscription checkout) passou verde — run 32576075493." },
  }),
  task("FOUND-003", "FASE-0", "Armazenamento de mídia (R2)", {
    description: "Bucket my-happy-place-media, binding FUNNEL_MEDIA, scripts de seed/upload.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: ["Bucket existe e está vinculado ao Worker"],
  }),
  task("FOUND-004", "FASE-0", "FunnelDefinition schema", {
    description: "src/funnel/schema — define a forma de um funil (cenas, interações, transições).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "src/funnel/schema/v1 define os tipos de FunnelDefinition usados por runtime, validator e Studio",
      "npm run typecheck passa usando esses tipos em todo o projeto",
    ],
    evidence: { typecheck: "npm run typecheck limpo em 2026-08-22" },
  }),
  task("FOUND-005", "FASE-0", "FunnelRuntime", {
    description: "src/funnel/runtime — executa um FunnelDefinition (coberto por funnelRuntime.test.ts).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "funnelRuntime.test.ts cobre a execução do FunnelRuntime e passa em npm run test:run",
      "FunnelRuntime é importado por FunnelStudio.tsx, GuidedPreview.tsx e RuntimeOverlays.tsx (fluxo real do Studio)",
    ],
    evidence: { tests: "src/funnel/tests/funnelRuntime.test.ts passa no gate atual" },
  }),
  task("FOUND-006", "FASE-0", "Validador de funil", {
    description: "src/funnel/validator — valida um FunnelDefinition antes de permitir publicar/salvar.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "validateFunnel é exercitado por funnelRuntime.test.ts, marinaOfficialFunnel.test.ts e studioState.test.ts, todos passando",
      "validateFunnel é usado em código real do Studio (studioState.ts, GuidedBuilder.tsx, StudioInspector.tsx)",
    ],
    evidence: { tests: "validateFunnel coberto indiretamente por funnelRuntime.test.ts, marinaOfficialFunnel.test.ts e studioState.test.ts — todos passando em 2026-08-22" },
  }),
  task("FOUND-007", "FASE-0", "Guided Builder", {
    description: "src/funnel/studio/GuidedBuilder.tsx — fluxo guiado de criação de funil.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "GuidedBuilder.tsx é o componente renderido pelo fluxo real de criação de funil em /studio (via ProductStudio → FunnelStudio)",
      "guidedState.test.ts e guidedReview.test.ts cobrem a lógica do fluxo guiado e passam",
    ],
    evidence: { tests: "src/funnel/tests/guidedState.test.ts e src/funnel/tests/guidedReview.test.ts passam" },
  }),
  task("FOUND-008", "FASE-0", "Editor avançado (modo livre, fora do fluxo guiado)", {
    description: "Reaudicao (2026-08-22): existe, sim, um modo avançado real dentro de FunnelStudio.tsx — Timeline de cenas, StudioInspector (edição direta de cena/evento), reordenar cenas, exportar/importar FunnelDefinition como JSON. O Guided Builder expõe um botão 'Editor avançado' (src/funnel/studio/GuidedBuilder.tsx:239 e :747) que chama onAdvanced() e troca guidedUi.mode para 'advanced', revelando essa superfície. Isso é alcançável a partir do fluxo real do produto: /studio (ProductStudio) → FunnelStudio (com forceGuided=true, que só define o modo INICIAL — não impede trocar para 'advanced' depois) → botão 'Editor avançado'.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: ["Existe uma superfície de edição direta do FunnelDefinition fora do fluxo guiado, alcançável a partir de /studio"],
    evidence: { notes: "src/funnel/studio/GuidedBuilder.tsx:239,747 (botão 'Editor avançado') → src/funnel/studio/FunnelStudio.tsx:408,427 (onAdvanced → mode:'advanced') renderiza Timeline + StudioInspector + import/export de JSON, confirmado por leitura de código em 2026-08-22." },
    internalNotes: "Não confundir com a complexidade de interação dentro do próprio Guided Builder (GuidedComplexInteractions.tsx) — isso é outra coisa. forceGuided no ProductStudio só define o modo inicial do FunnelStudio, não trava a navegação para 'advanced'.",
  }),
  task("FOUND-009", "FASE-0", "Asset Manager", {
    description: "src/funnel/studio/AssetManager.tsx — gestão de mídia dentro do Studio.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: [
      "AssetManager.tsx é usado por FunnelStudio.tsx e InlineMediaPicker.tsx, alcançável a partir de /studio",
      "assetManagerState.test.ts cobre a lógica de estado do gerenciador de assets e passa",
    ],
    evidence: { tests: "src/funnel/tests/assetManagerState.test.ts passa" },
  }),
  task("FOUND-010", "FASE-0", "Upload permanente para R2", {
    description: "permanentUpload.ts + R2UploadProof.tsx (coberto por permanentUpload.test.ts).",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: [
      "permanentUpload.test.ts cobre o fluxo de upload permanente para R2 e passa",
      "R2UploadProof.tsx existe como demonstração do fluxo real de upload",
    ],
    evidence: { tests: "src/funnel/tests/permanentUpload.test.ts passa" },
  }),
  task("FOUND-011", "FASE-0", "InlineMediaPicker", {
    description: "Seleção de mídia inline dentro do fluxo de edição.",
    status: "DONE", priority: "LOW",
    acceptanceCriteria: [
      "InlineMediaPicker.tsx é importado e usado por GuidedBuilder.tsx, GuidedComplexInteractions.tsx e GuidedEssentialInteractions.tsx (fluxo real do Studio)",
    ],
    evidence: { notes: "Sem teste automatizado dedicado; alcançabilidade confirmada por leitura de código (grep de imports) em 2026-08-22." },
  }),
  task("FOUND-012", "FASE-0", "Versionamento seguro de assets", {
    description: "AssetVersionInspector.tsx mantém previousVersions e expõe exclusão remota — hoje intencionalmente desativada até validação completa.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: [
      "AssetVersionInspector.tsx é renderizado dentro de AssetManager.tsx, alcançável a partir de /studio",
      "mantém histórico de previousVersions por asset; exclusão remota fica desativada por decisão deliberada, não por bug pendente",
    ],
    evidence: { notes: "Import de AssetVersionInspector.tsx por AssetManager.tsx confirmado por leitura de código em 2026-08-22." },
    internalNotes: "Botão 'EXCLUIR VERSÃO' está com disabled + tooltip explicando que a exclusão remota está pausada para validação. Reavaliar antes de reativar.",
  }),
  task("FOUND-013", "FASE-0", "Funil oficial Marina", {
    description: "marinaOfficialFunnel.ts + marinaProofs.ts, coberto por marinaOfficialFunnel.test.ts.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: ["marinaOfficialFunnel.test.ts cobre a definição do funil oficial da Marina e passa"],
    evidence: { tests: "src/funnel/tests/marinaOfficialFunnel.test.ts passa" },
  }),
  task("FOUND-014", "FASE-0", "Blueprint (fonte da narrativa)", {
    description: "/studio/blueprint + blueprintData.ts — onde a história da Marina é acompanhada (cenas, takes, assets). Continua sendo a fonte de verdade NARRATIVA; este roadmap não a substitui, cuida do produto/negócio.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: [
      "blueprintData.test.ts cobre a lógica de dados do Blueprint e passa",
      "src/routes/studio/blueprint.tsx é uma rota real do produto que importa blueprintData.ts",
    ],
    evidence: { tests: "src/funnel/tests/blueprintData.test.ts passa" },
  }),
  task("FOUND-015", "FASE-0", "Sistema de design do Studio (ui.tsx)", {
    description: "Primitivos visuais compartilhados (Card, Badge, botões, Stepper, StudioSelect) usados em /studio, /studio/admin, /signup.",
    status: "DONE", priority: "MEDIUM",
    acceptanceCriteria: [
      "ui.tsx exporta os primitivos (Card, Badge, botões, Stepper, StudioSelect) importados por /studio/admin, /studio/roadmap e /signup",
      "npm run typecheck e npm run build passam usando esses componentes",
    ],
    evidence: { typecheck: "npm run typecheck limpo em 2026-08-22", build: "npm run build ok em 2026-08-22" },
    internalNotes: "O sistema de primitivos existe e está em uso real e funcional. O 'redesign Canva-like' completo do produto (visão maior) não é um marco fechado — tratar telas ainda fora deste padrão como trabalho contínuo, não como regressão desta task.",
  }),
  task("FOUND-016", "FASE-0", "StudioSelect (dropdown customizado)", {
    description: "Substitui <select> nativo por Radix para consistência visual entre navegadores/SOs.",
    status: "DONE", priority: "LOW",
    acceptanceCriteria: [
      "StudioSelect é usado em AssetManager.tsx, GuidedBuilder.tsx, GuidedComplexInteractions.tsx e GuidedEssentialInteractions.tsx (fluxo real do Studio)",
    ],
    evidence: { notes: "Alcançabilidade confirmada por leitura de código (grep de imports) em 2026-08-22." },
  }),
  task("FOUND-017", "FASE-0", "Suite de testes automatizados", {
    description: "Arquivos de teste via vitest, incluindo os do roadmap operacional (src/product).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["npm run test:run executa e todos os testes passam"],
    evidence: { tests: "npm run test:run — todos os testes passando, verificado em 2026-08-22 (ver contagem atual no relatório de execução, não congelar o número aqui)" },
    internalNotes: "Número de testes cresce; reconferir sempre via `npm run test:run` em vez de confiar em um valor congelado nesta task.",
  }),
  task("FOUND-018", "FASE-0", "Autenticação + sincronização em nuvem (Supabase)", {
    description: "Login obrigatório para /studio; produtos e funis sincronizados no Supabase (cross-device).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "/studio redireciona um usuário deslogado para /login (guard real no código de produção)",
      "FunnelStudio.tsx chama pushFunnelToSupabase ao salvar, sincronizando o funil na nuvem",
    ],
    evidence: { commit: "3b3b615, bea1a5d" },
  }),
  task("FOUND-019", "FASE-0", "Painel de admin (contas + produtos)", {
    description: "Versão inicial de /studio/admin — CRUD de contas de cliente e listagem de todos os produtos.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "/studio/admin permite criar e excluir contas de cliente via POST/DELETE /api/admin/clients",
      "acesso restrito a role admin, via guard client-side + requireAdmin() no server",
    ],
    evidence: { commit: "f0f1dc9" },
    internalNotes: "Esta é a base que a FASE-9 (CEO Control Center) expande — não é o cockpit completo pedido pelo usuário.",
  }),
  task("FOUND-020", "FASE-0", "Billing do nosso SaaS (Stripe + KawaiPay)", {
    description: "Checkout embutido (Stripe Elements) em /signup, webhook Stripe e webhook KawaiPay ativando conta automaticamente após pagamento aprovado.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: [
      "POST /api/billing/subscribe retorna um clientSecret válido do Stripe",
      "handleBillingWebhook e handleKawaipayWebhook ativam a conta do cliente via inviteUserByEmail ao receber evento de pagamento aprovado",
    ],
    evidence: { commit: "8e049cc, 52131c3", notes: "Testado ao vivo em produção em 2026-08-22: POST https://my-happy-place.kawai-zzindigital.workers.dev/api/billing/subscribe retornou clientSecret válido." },
    internalNotes: "Isso cobra pelo ACESSO AO STUDIO. Não confundir com o checkout do funil do cliente final (ver FASE-5/CTA externo e item 36 do pedido original — são coisas deliberadamente separadas).",
  }),
  task("FOUND-021", "FASE-0", "Menu de conta (avatar, e-mail, cargo, sair)", {
    description: "UserMenu.tsx no header do Studio/Admin.",
    status: "DONE", priority: "LOW",
    acceptanceCriteria: ["UserMenu.tsx é renderizado no header de /studio, /studio/admin e /studio/roadmap, mostrando e-mail, badge de role e botão Sair"],
    evidence: { commit: "6aee652" },
  }),

  // ---- FASE 1 — Roadmap operacional (fase atual) -------------------------------------------------
  task("ROADMAP-001", "FASE-1", "Fonte única de verdade do roadmap", {
    description: "src/product/roadmap.ts — tipos Roadmap/RoadmapPhase/RoadmapTask/RoadmapEvidence + dados.",
    status: "DONE", priority: "NOW",
    acceptanceCriteria: ["Arquivo único, tipado, sem duplicar em .md/.json manuais", "typecheck limpo", "usado por /studio/roadmap e /roadmap"],
    evidence: { commit: "38b38ed", typecheck: "npm run typecheck limpo em 2026-08-22", notes: "src/product/roadmap.ts é a única fonte; /studio/roadmap e /roadmap importam dela (roadmap.ts, publicRoadmap.ts)." },
  }),
  task("ROADMAP-002", "FASE-1", "Rota interna /studio/roadmap", {
    description: "Visão completa (admin-only) com dependências, acceptance criteria, notas internas, evidência.",
    status: "DONE", priority: "NOW",
    dependencies: ["ROADMAP-001"],
    acceptanceCriteria: ["Protegida pelo mesmo guard de admin já usado em /studio/admin", "Mostra todos os campos, inclusive internos"],
    evidence: { notes: "Validado visualmente pelo dono do produto, autenticado como admin, em 2026-08-22: desktop, mobile, bloco AGORA, bloco PRÓXIMO, expansão/recolhimento das fases, leitura das tasks, evidence/commits e legibilidade geral — todos aprovados." },
    internalNotes: "Implementação reaproveita literalmente o guard de useSupabaseSession()+useProfile() de /studio/admin, e o TaskCard expandido renderiza acceptanceCriteria/internalNotes/evidence.",
  }),
  task("ROADMAP-003", "FASE-1", "Rota pública /roadmap", {
    description: "Read-only, sanitizada, para acompanhamento externo da evolução do produto.",
    status: "DONE", priority: "NOW",
    dependencies: ["ROADMAP-001", "ROADMAP-004"],
    acceptanceCriteria: ["Não requer login", "noindex,nofollow", "usa toPublicRoadmap()"],
    evidence: { commit: "38b38ed", notes: "Confirmado ao vivo em 2026-08-22: curl sem sessão retornou 200; HTML continha 'noindex,nofollow'; screenshots desktop (1280px) e mobile (390px) via Chrome headless mostraram o layout renderizado a partir de toPublicRoadmap()." },
  }),
  task("ROADMAP-004", "FASE-1", "Sanitização por allowlist (toPublicRoadmap)", {
    description: "Função explícita que decide campo a campo o que sai para o público — nunca esconder por CSS.",
    status: "DONE", priority: "NOW",
    acceptanceCriteria: ["internalNotes, evidence.commit/branch/deployUrl/notes nunca aparecem no payload público", "coberta por teste de integridade"],
    evidence: { tests: "src/product/publicRoadmap.test.ts — 7 testes, todos passando (verificado em 2026-08-22)", notes: "curl no HTML renderizado de /roadmap não retornou nenhuma ocorrência de internalNotes/sk_live/whsec_/e-mails/customer IDs." },
  }),
  task("ROADMAP-005", "FASE-1", "Evidência real por task", {
    description: "Campo evidence preenchido apenas quando existe evidência real (nunca fictício).",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["Nenhum valor de evidence inventado — vazio quando não houver prova"],
    evidence: { notes: "Prática seguida em todas as ~185 tasks deste arquivo: campos evidence.* só preenchidos com commit/teste/observação real, deixados vazios quando não há prova. É uma disciplina contínua, reforçada pelo protocolo (docs/ROADMAP_PROTOCOL.md), não um artefato que 'termina' — reavaliar a cada nova task adicionada." },
  }),
  task("ROADMAP-006", "FASE-1", "Testes de integridade do roadmap", {
    description: "IDs únicos, phaseId válido, dependencies existentes, status válido, DONE com acceptanceCriteria, scope EXTERNAL fora do progresso CORE.",
    status: "DONE", priority: "HIGH",
    dependencies: ["ROADMAP-001"],
    acceptanceCriteria: [
      "IDs de task e de fase são únicos",
      "toda task referencia uma fase e dependencies reais",
      "todo status é um dos valores válidos",
      "nenhuma task DONE depende de uma task ainda TODO/BLOCKED",
      "toda task DONE possui acceptanceCriteria não-vazio",
      "tasks EXTERNAL ficam fora da contagem de progresso CORE",
      "npm run test:run passa",
    ],
    evidence: { tests: "src/product/roadmap.test.ts — 7 testes passando (IDs únicos de task, IDs únicos de fase, phaseId válido, dependencies existentes, status válido, DONE não depende de TODO/BLOCKED, DONE possui acceptanceCriteria não-vazio, EXTERNAL fora do CORE), verificado em 2026-08-22." },
    internalNotes: "Fechado nesta execução (2026-08-22): a regra 'toda task DONE possui acceptanceCriteria' agora é um teste real (roadmap.test.ts), e as 19 tasks que estavam DONE com acceptanceCriteria vazio (FOUND-004,005,006,007,009,010,011,012,013,014,015,016,017,018,019,020,021, ADMIN-001, ADMIN-003) receberam critérios mínimos baseados em evidência já auditada (testes existentes, reachability confirmada por leitura de código, ou typecheck/build). Nenhuma foi rebaixada — todas tinham evidência suficiente para sustentar DONE.",
  }),
  task("ROADMAP-007", "FASE-1", "Protocolo para futuros agentes/contribuidores", {
    description: "docs/ROADMAP_PROTOCOL.md — como toda feature nova deve nascer de uma task e atualizar este arquivo.",
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["docs/ROADMAP_PROTOCOL.md existe e documenta o processo (localizar/criar task, transição de status, regra de DONE, sanitização pública)"],
    evidence: { commit: "38b38ed", notes: "docs/ROADMAP_PROTOCOL.md existe, cobre: como localizar/criar task, transição de status, regra de DONE, sanitização pública, escopo CORE vs EXTERNAL, e a arquitetura macro de plataforma decidida." },
  }),

  // ---- FASE 2 — Planos / Entitlements -------------------------------------------------------------
  task("PLAN-001", "FASE-2", "Modelo de plano", { priority: "HIGH" }),
  task("PLAN-002", "FASE-2", "Entitlements por plano", { dependencies: ["PLAN-001"] }),
  task("PLAN-003", "FASE-2", "Quotas de uso", { dependencies: ["PLAN-001"] }),
  task("PLAN-004", "FASE-2", "Modelo de preço mensal", {
    description: "Starter R$97, Pro R$197, Scale R$397, Agency R$797 — base comercial inicial, ajustável, não implementada em Stripe ainda.",
    priority: "HIGH",
    internalNotes: "Preço é decisão comercial registrada aqui, não configuração de Stripe — não criar Price na Stripe a partir desta task.",
  }),
  task("PLAN-005", "FASE-2", "Modelo de preço anual", { description: "Starter R$970, Pro R$1.970, Scale R$3.970, Agency R$7.970." }),
  task("PLAN-006", "FASE-2", "Modelo de trial/acesso", { dependencies: ["PLAN-001"] }),
  task("PLAN-007", "FASE-2", "Modelo de conversão low-ticket", {
    description: "R$67 — ensinar o método e levar o usuário até o software. Pode incluir curso inicial/templates/acesso por período.",
  }),
  task("PLAN-008", "FASE-2", "Founders Lifetime (capacidade desativável)", {
    description: "R$1.997–R$2.997, desativado por padrão, sem aparecer no checkout padrão — só campanha futura. Lifetime não é tráfego/storage/IA infinitos.",
  }),
  task("PLAN-009", "FASE-2", "Resolvedor de acesso efetivo", { description: "Calcula o que o usuário pode fazer combinando plano + overrides manuais.", dependencies: ["PLAN-001", "PLAN-002"] }),
  task("PLAN-010", "FASE-2", "Override manual separado do status de billing", {
    description: "Admin pode conceder acesso manualmente sem que isso pareça uma assinatura Stripe/KawaiPay ativa.",
    dependencies: ["PLAN-009"],
  }),

  // ---- FASE 3 — Academy / Members -----------------------------------------------------------------
  task("ACADEMY-001", "FASE-3", "Modelo de curso"),
  task("ACADEMY-002", "FASE-3", "Modelo de módulo", { dependencies: ["ACADEMY-001"] }),
  task("ACADEMY-003", "FASE-3", "Modelo de aula", { dependencies: ["ACADEMY-002"] }),
  task("ACADEMY-004", "FASE-3", "Embed do YouTube", { description: "Vídeos das aulas via embed do YouTube — não hospedar vídeo de aula no Worker/R2 sem necessidade.", dependencies: ["ACADEMY-003"] }),
  task("ACADEMY-005", "FASE-3", "Rascunho/publicado por aula", { dependencies: ["ACADEMY-003"] }),
  task("ACADEMY-006", "FASE-3", "Ordenação de módulos/aulas", { dependencies: ["ACADEMY-002"] }),
  task("ACADEMY-007", "FASE-3", "Rota /academy autenticada", { dependencies: ["ACADEMY-001"] }),
  task("ACADEMY-008", "FASE-3", "Acesso por entitlement", { dependencies: ["ACADEMY-007", "PLAN-002"] }),
  task("ACADEMY-009", "FASE-3", "Progresso do aluno", { dependencies: ["ACADEMY-007"] }),
  task("ACADEMY-010", "FASE-3", "Continuar assistindo", { dependencies: ["ACADEMY-009"] }),
  task("ACADEMY-011", "FASE-3", "Aula concluída", { dependencies: ["ACADEMY-009"] }),
  task("ACADEMY-012", "FASE-3", "Gestão pelo admin", { dependencies: ["ACADEMY-001"] }),
  task("ACADEMY-013", "FASE-3", "Links contextuais Studio ↔ Academy", {
    description: "Ex.: na etapa de Produção, 'Como criar bons takes?'; na Interatividade, 'Como usar quiz?'; na Publicação, 'Como conectar domínio?'. Usuário aprende enquanto cria.",
    dependencies: ["ACADEMY-007"],
  }),

  // ---- FASE 4 — Publicação core --------------------------------------------------------------------
  task("PUBLISH-001", "FASE-4", "Modelo de funil publicado", { priority: "HIGH" }),
  task("PUBLISH-002", "FASE-4", "Versões publicadas imutáveis", {
    description: "PublishedFunnelVersion: funnelId, version, publishedAt, manifest, referências de asset.",
    dependencies: ["PUBLISH-001"], priority: "HIGH",
  }),
  task("PUBLISH-003", "FASE-4", "Validação ao publicar", { dependencies: ["PUBLISH-001"] }),
  task("PUBLISH-004", "FASE-4", "Slug da plataforma", { description: "go.marca.com/f/<slug> — nunca workers.dev como endereço comercial final.", dependencies: ["PUBLISH-002"] }),
  task("PUBLISH-005", "FASE-4", "Rota pública de runtime", { dependencies: ["PUBLISH-002"] }),
  task("PUBLISH-006", "FASE-4", "Hot path sem Supabase", {
    description: "Visitante não deve depender de SELECT/INSERT síncrono no Supabase a cada interação — servir a partir do snapshot publicado + R2.",
    dependencies: ["PUBLISH-002"], priority: "HIGH",
  }),
  task("PUBLISH-007", "FASE-4", "Estratégia de cache de edge", { dependencies: ["PUBLISH-005"] }),
  task("PUBLISH-008", "FASE-4", "Resolução de assets via R2", { dependencies: ["PUBLISH-002"] }),
  task("PUBLISH-009", "FASE-4", "Despublicar", { dependencies: ["PUBLISH-002"] }),
  task("PUBLISH-010", "FASE-4", "Rollback de versão", { dependencies: ["PUBLISH-002"] }),
  task("PUBLISH-011", "FASE-4", "Estado rascunho vs. publicado", { dependencies: ["PUBLISH-001"] }),

  // ---- FASE 5 — CTA externo -------------------------------------------------------------------------
  task("CTA-001", "FASE-5", "Bloco/ação de link externo", {
    description: "Genérico: label, URL, comportamento de abertura, metadata de tracking. Nome conceitual: LINK EXTERNO / CTA EXTERNO.",
    dependencies: ["PUBLISH-001"],
  }),
  task("CTA-002", "FASE-5", "UX do CTA final", { description: "Reaproveita o bloco genérico — não criar sistema exclusivo/rígido de 'checkout'.", dependencies: ["CTA-001"] }),
  task("CTA-003", "FASE-5", "Validação de URL", { dependencies: ["CTA-001"] }),
  task("CTA-004", "FASE-5", "Comportamento de abertura", { dependencies: ["CTA-001"] }),
  task("CTA-005", "FASE-5", "Evento de clique no CTA", { dependencies: ["CTA-001"] }),
  task("CTA-006", "FASE-5", "Nunca bloquear redirect por falha de analytics", { dependencies: ["CTA-005"] }),
  task("CTA-007", "FASE-5", "Agnóstico de provedor de checkout", {
    description: "Hotmart, Kiwify, Kirvano, Eduzz, Monetizze, Stripe Checkout, Shopify, Calendly, WhatsApp ou qualquer URL válida — nós apenas redirecionamos, nunca processamos a compra.",
    dependencies: ["CTA-001"],
  }),

  // ---- FASE 6 — Domínios personalizados --------------------------------------------------------------
  task("DOMAIN-001", "FASE-6", "Modelo de hostname personalizado", { dependencies: ["PUBLISH-002"] }),
  task("DOMAIN-002", "FASE-6", "Integração Cloudflare for SaaS", {
    description: "Cliente nunca cria conta Cloudflare nem configura Worker — plataforma provisiona custom hostname.",
    dependencies: ["DOMAIN-001"], priority: "HIGH",
  }),
  task("DOMAIN-003", "FASE-6", "Instruções de DNS para o cliente", { dependencies: ["DOMAIN-002"] }),
  task("DOMAIN-004", "FASE-6", "Verificação do domínio", { dependencies: ["DOMAIN-002"] }),
  task("DOMAIN-005", "FASE-6", "Status de SSL", { dependencies: ["DOMAIN-002"] }),
  task("DOMAIN-006", "FASE-6", "Resolução hostname → tenant", { dependencies: ["DOMAIN-004"], priority: "HIGH" }),
  task("DOMAIN-007", "FASE-6", "Teste de segurança: isolamento de domínio", {
    description: "Um hostname nunca pode resolver o funil de outro cliente.",
    dependencies: ["DOMAIN-006"], priority: "HIGH",
  }),
  task("DOMAIN-008", "FASE-6", "Desconectar domínio", { dependencies: ["DOMAIN-002"] }),
  task("DOMAIN-009", "FASE-6", "Quota de domínios por plano", { dependencies: ["DOMAIN-002", "PLAN-002"] }),
  task("DOMAIN-010", "FASE-6", "MVP: subdomínios", {
    description: "oferta.cliente.com, quiz.cliente.com, go.cliente.com — foco inicial, sem prometer apex/root domain.",
    dependencies: ["DOMAIN-002"],
  }),
  task("DOMAIN-011", "FASE-6", "Investigação de domínio apex (fase posterior)", { dependencies: ["DOMAIN-010"], priority: "LOW" }),

  // ---- FASE 7 — Onboarding -----------------------------------------------------------------------
  task("ONBOARD-001", "FASE-7", "Boas-vindas"),
  task("ONBOARD-002", "FASE-7", "Seleção de objetivo"),
  task("ONBOARD-003", "FASE-7", "Primeiro produto"),
  task("ONBOARD-004", "FASE-7", "Primeiro funil"),
  task("ONBOARD-005", "FASE-7", "Escolher template", { dependencies: ["TEMPLATE-001"] }),
  task("ONBOARD-006", "FASE-7", "Criar primeira cena"),
  task("ONBOARD-007", "FASE-7", "Checklist de ativação"),
  task("ONBOARD-008", "FASE-7", "Continuar do último passo"),
  task("ONBOARD-009", "FASE-7", "Onboarding contextual via Academy", { dependencies: ["ACADEMY-013"] }),
  task("ONBOARD-010", "FASE-7", "Primeiro funil publicado", {
    description: "Métrica-alvo futura: TIME TO FIRST PUBLISHED EXPERIENCE.",
    dependencies: ["PUBLISH-002"],
  }),

  // ---- FASE 8 — Templates -------------------------------------------------------------------------
  task("TEMPLATE-001", "FASE-8", "Modelo de template", { priority: "MEDIUM" }),
  task("TEMPLATE-002", "FASE-8", "Clonar funil", { dependencies: ["TEMPLATE-001"] }),
  task("TEMPLATE-003", "FASE-8", "Galeria", { dependencies: ["TEMPLATE-001"] }),
  task("TEMPLATE-004", "FASE-8", "Categorias", { dependencies: ["TEMPLATE-003"] }),
  task("TEMPLATE-005", "FASE-8", "Pré-visualização", { dependencies: ["TEMPLATE-003"] }),
  task("TEMPLATE-006", "FASE-8", "Restrições por plano", { dependencies: ["TEMPLATE-001", "PLAN-002"] }),
  task("TEMPLATE-007", "FASE-8", "Gestão pelo admin", {
    description: "Modelos planejados: funil de descoberta emocional, VSL interativo, diagnóstico interativo, storytelling via WhatsApp, quiz + ligação surpresa, funil de aplicação high-ticket.",
    dependencies: ["TEMPLATE-001"],
  }),

  // ---- FASE 9 — CEO Control Center ------------------------------------------------------------------
  task("ADMIN-001", "FASE-9", "Shell do admin", {
    status: "DONE", priority: "HIGH",
    acceptanceCriteria: ["/studio/admin existe como rota real, protegida por guard de admin, com header, Breadcrumb e UserMenu"],
    evidence: { commit: "f0f1dc9" },
  }),
  task("ADMIN-002", "FASE-9", "KPIs de visão geral"),
  task("ADMIN-003", "FASE-9", "Usuários", {
    status: "DONE",
    description: "CRUD básico já existe em /studio/admin (criar/excluir conta de cliente).",
    acceptanceCriteria: ["POST e DELETE /api/admin/clients permitem criar e excluir contas de cliente a partir de /studio/admin, protegidos por requireAdmin()"],
    evidence: { commit: "f0f1dc9" },
  }),
  task("ADMIN-004", "FASE-9", "Ativar/reativar conta", { dependencies: ["ADMIN-003"] }),
  task("ADMIN-005", "FASE-9", "Reset de senha seguro", { dependencies: ["ADMIN-003"] }),
  task("ADMIN-006", "FASE-9", "Overrides de acesso", { dependencies: ["PLAN-010"] }),
  task("ADMIN-007", "FASE-9", "Eventos de billing (log de webhooks)", { dependencies: ["FOUND-020"], priority: "HIGH" }),
  task("ADMIN-008", "FASE-9", "Idempotência de webhook", { dependencies: ["ADMIN-007"] }),
  task("ADMIN-009", "FASE-9", "Saúde dos webhooks", { dependencies: ["ADMIN-007"] }),
  task("ADMIN-010", "FASE-9", "Assinaturas Stripe (visão admin)", { dependencies: ["FOUND-020"] }),
  task("ADMIN-011", "FASE-9", "Assinaturas KawaiPay (visão admin)", { dependencies: ["FOUND-020"] }),
  task("ADMIN-012", "FASE-9", "MRR por provedor/moeda", { dependencies: ["ADMIN-010", "ADMIN-011"] }),
  task("ADMIN-013", "FASE-9", "Log de auditoria do admin"),
  task("ADMIN-014", "FASE-9", "Uso do produto", { description: "Contagem de produtos/funis — versão atual de /studio/admin já mostra lista de produtos.", status: "IN_PROGRESS", evidence: { commit: "f0f1dc9" } }),
  task("ADMIN-015", "FASE-9", "Planos (visão admin)", { dependencies: ["PLAN-001"] }),
  task("ADMIN-016", "FASE-9", "Entitlements (visão admin)", { dependencies: ["PLAN-002"] }),
  task("ADMIN-017", "FASE-9", "Quotas (visão admin)", { dependencies: ["PLAN-003"] }),
  task("ADMIN-018", "FASE-9", "Academy (visão admin)", { dependencies: ["ACADEMY-012"] }),
  task("ADMIN-019", "FASE-9", "Templates (visão admin)", { dependencies: ["TEMPLATE-007"] }),
  task("ADMIN-020", "FASE-9", "Domínios (visão admin)", { dependencies: ["DOMAIN-002"] }),
  task("ADMIN-021", "FASE-9", "Funis publicados (visão admin)", { dependencies: ["PUBLISH-002"] }),
  task("ADMIN-022", "FASE-9", "Alertas operacionais"),

  // ---- FASE 10 — Analytics / Metering ---------------------------------------------------------------
  task("ANALYTICS-001", "FASE-10", "Início de sessão", { dependencies: ["PUBLISH-005"] }),
  task("ANALYTICS-002", "FASE-10", "Cena visualizada", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-003", "FASE-10", "Interação exibida", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-004", "FASE-10", "Interação concluída", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-005", "FASE-10", "Escolha selecionada", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-006", "FASE-10", "Funil concluído", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-007", "FASE-10", "Clique em CTA externo", { dependencies: ["CTA-005"] }),
  task("ANALYTICS-008", "FASE-10", "Abandono (drop-off)", { dependencies: ["ANALYTICS-001"] }),
  task("ANALYTICS-009", "FASE-10", "Ingestão no edge", { dependencies: ["ANALYTICS-001"], priority: "HIGH" }),
  task("ANALYTICS-010", "FASE-10", "Estratégia Analytics Engine / Queues", { dependencies: ["ANALYTICS-009"] }),
  task("ANALYTICS-011", "FASE-10", "Dashboard", { dependencies: ["ANALYTICS-009"] }),
  task("ANALYTICS-012", "FASE-10", "Medição de uso (metering)", { dependencies: ["ANALYTICS-009", "PLAN-003"] }),
  task("ANALYTICS-013", "FASE-10", "Quotas mensais", { dependencies: ["ANALYTICS-012"] }),
  task("ANALYTICS-014", "FASE-10", "Fundação de overage", { dependencies: ["ANALYTICS-013"] }),

  // ---- FASE 11 — Personalização / Memória ------------------------------------------------------------
  task("PERSONAL-001", "FASE-11", "Variáveis", { dependencies: ["PUBLISH-001"] }),
  task("PERSONAL-002", "FASE-11", "Persistir respostas", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-003", "FASE-11", "Usar respostas depois", { dependencies: ["PERSONAL-002"] }),
  task("PERSONAL-004", "FASE-11", "Copy condicional", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-005", "FASE-11", "Cena condicional", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-006", "FASE-11", "Interação condicional", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-007", "FASE-11", "Pontuação (scoring)", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-008", "FASE-11", "Tags", { dependencies: ["PERSONAL-001"] }),
  task("PERSONAL-009", "FASE-11", "Lógica de segmento", { dependencies: ["PERSONAL-007", "PERSONAL-008"] }),
  task("PERSONAL-010", "FASE-11", "Pré-visualização de variáveis", { dependencies: ["PERSONAL-001"] }),

  // ---- FASE 12 — Interações 2.0 ------------------------------------------------------------------------
  task("INTERACTION-101", "FASE-12", "Indicador de digitação"),
  task("INTERACTION-102", "FASE-12", "Gravação de áudio"),
  task("INTERACTION-103", "FASE-12", "Chamada de vídeo"),
  task("INTERACTION-104", "FASE-12", "Tela de bloqueio"),
  task("INTERACTION-105", "FASE-12", "DM do Instagram"),
  task("INTERACTION-106", "FASE-12", "E-mail"),
  task("INTERACTION-107", "FASE-12", "Calendário/lembrete"),
  task("INTERACTION-108", "FASE-12", "Localização/mapa"),
  task("INTERACTION-109", "FASE-12", "Contagem regressiva narrativa"),
  task("INTERACTION-110", "FASE-12", "Slider"),
  task("INTERACTION-111", "FASE-12", "Arrastar/ordenar"),
  task("INTERACTION-112", "FASE-12", "Texto livre"),
  task("INTERACTION-113", "FASE-12", "Resposta por voz"),
  task("INTERACTION-114", "FASE-12", "Upload de imagem"),
  task("INTERACTION-115", "FASE-12", "Desbloquear/revelar"),

  // ---- FASE 13 — Integrações de marketing --------------------------------------------------------------
  task("MARKETING-001", "FASE-13", "UTMs", { dependencies: ["PUBLISH-005"] }),
  task("MARKETING-002", "FASE-13", "Meta Pixel", { dependencies: ["PUBLISH-005"] }),
  task("MARKETING-003", "FASE-13", "Tags do Google", { dependencies: ["PUBLISH-005"] }),
  task("MARKETING-004", "FASE-13", "Webhook de saída", { dependencies: ["ANALYTICS-009"] }),
  task("MARKETING-005", "FASE-13", "Captura de lead", { dependencies: ["PUBLISH-005"] }),
  task("MARKETING-006", "FASE-13", "Integrações de CRM", { dependencies: ["MARKETING-005"] }),
  task("MARKETING-007", "FASE-13", "Provedores de e-mail", { dependencies: ["MARKETING-005"] }),
  task("MARKETING-008", "FASE-13", "Eventos de conversão server-side", { dependencies: ["MARKETING-002", "MARKETING-003"] }),

  // ---- FASE 14 — Atribuição de compra -------------------------------------------------------------------
  task("ATTRIBUTION-001", "FASE-14", "API de webhook de conversão", {
    description: "Nós não somos checkout — isto recebe confirmação de compra de fora, nunca processa dinheiro.",
    dependencies: ["CTA-007"],
  }),
  task("ATTRIBUTION-002", "FASE-14", "Evento de compra", { dependencies: ["ATTRIBUTION-001"] }),
  task("ATTRIBUTION-003", "FASE-14", "Adaptadores por provedor", { dependencies: ["ATTRIBUTION-001"] }),
  task("ATTRIBUTION-004", "FASE-14", "Atribuição clique → compra", { dependencies: ["ATTRIBUTION-002", "ANALYTICS-007"] }),
  task("ATTRIBUTION-005", "FASE-14", "Analytics de receita", { dependencies: ["ATTRIBUTION-004"] }),

  // ---- FASE 15 — Agency / Times ---------------------------------------------------------------------------
  task("AGENCY-001", "FASE-15", "Workspaces"),
  task("AGENCY-002", "FASE-15", "Membros do time", { dependencies: ["AGENCY-001"] }),
  task("AGENCY-003", "FASE-15", "Papéis (roles)", { dependencies: ["AGENCY-002"] }),
  task("AGENCY-004", "FASE-15", "Workspaces de cliente", { dependencies: ["AGENCY-001"] }),
  task("AGENCY-005", "FASE-15", "Clonar/compartilhar", { dependencies: ["AGENCY-001"] }),
  task("AGENCY-006", "FASE-15", "Múltiplos domínios", { dependencies: ["AGENCY-001", "DOMAIN-002"] }),
  task("AGENCY-007", "FASE-15", "Quotas de agência", { dependencies: ["AGENCY-001", "PLAN-003"] }),
  task("AGENCY-008", "FASE-15", "Investigação de white-label", { dependencies: ["AGENCY-001"], priority: "LOW" }),

  // ---- FASE 16 — Marketplace (só após validar o resto) -----------------------------------------------------
  task("MARKET-001", "FASE-16", "Criadores de template", { dependencies: ["TEMPLATE-001"], priority: "LOW" }),
  task("MARKET-002", "FASE-16", "Marketplace", { dependencies: ["MARKET-001"], priority: "LOW" }),
  task("MARKET-003", "FASE-16", "Templates pagos", { dependencies: ["MARKET-002"], priority: "LOW" }),
  task("MARKET-004", "FASE-16", "Comissão", { dependencies: ["MARKET-003"], priority: "LOW" }),
  task("MARKET-005", "FASE-16", "Repasse ao criador", { dependencies: ["MARKET-004"], priority: "LOW" }),
  task("MARKET-006", "FASE-16", "Moderação", { dependencies: ["MARKET-002"], priority: "LOW" }),

  // ---- FASE EXT — Projetos externos --------------------------------------------------------------------------
  task("EXTERNAL-001", "FASE-EXT", "Site de marketing (landing/pricing público)", {
    description: "www.marca.com — landing page, pricing público, cases, SEO, conteúdo, demo comercial, FAQ. Decisão: vive em projeto separado, não neste repositório.",
    publicDescription: "Site de marketing institucional — projeto próprio, fora deste produto.",
    scope: "EXTERNAL", priority: "MEDIUM",
    internalNotes: "Não implementar landing/pricing aqui. Não usar Supabase para tráfego de landing normal.",
  }),
];

export const ROADMAP: Roadmap = {
  productName: "Funnel Studio",
  tagline: "Construtor de Experiências Interativas de Venda",
  category: "Construtor de Experiências Interativas de Venda",
  conceptMessage: "Não crie mais páginas. Crie experiências.",
  phases: PHASES,
  tasks: TASKS,
};

// ---------------------------------------------------------------------------
// Derived helpers (used by both /studio/roadmap and /roadmap)
// ---------------------------------------------------------------------------

export function tasksByPhase(phaseId: string): RoadmapTask[] {
  return ROADMAP.tasks.filter((t) => t.phaseId === phaseId);
}

/** Only CORE-scope tasks count toward product progress — EXTERNAL work (e.g. the marketing site) never does. */
export function coreProgress(): { done: number; total: number } {
  const core = ROADMAP.tasks.filter((t) => t.scope === "CORE");
  return { done: core.filter((t) => t.status === "DONE").length, total: core.length };
}

export function phaseProgress(phaseId: string): { done: number; total: number } {
  const tasks = tasksByPhase(phaseId).filter((t) => t.scope === "CORE");
  return { done: tasks.filter((t) => t.status === "DONE").length, total: tasks.length };
}

/** The single phase currently being worked (first phase, in declaration order, with an IN_PROGRESS or NEXT task). */
export function currentPhase(): RoadmapPhase | undefined {
  return ROADMAP.phases.find((p) => tasksByPhase(p.id).some((t) => t.status === "IN_PROGRESS" || t.status === "NEXT"));
}

/** "AGORA" block — at most 3 items, IN_PROGRESS first then NEXT, in declaration order. */
export function nowTasks(limit = 3): RoadmapTask[] {
  const inProgress = ROADMAP.tasks.filter((t) => t.status === "IN_PROGRESS");
  const next = ROADMAP.tasks.filter((t) => t.status === "NEXT");
  return [...inProgress, ...next].slice(0, limit);
}
