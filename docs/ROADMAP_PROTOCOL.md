# Protocolo do roadmap

Fonte única de verdade: `src/product/roadmap.ts` (tipos + dados). Não criar `ROADMAP.md`, `roadmap.json`
ou qualquer outra cópia manual — este documento explica o *processo*, os dados vivem só ali.

- `/studio/roadmap` — visão interna completa (admin-only), inclui notas internas e evidência.
- `/roadmap` — visão pública somente leitura, sanitizada por `src/product/publicRoadmap.ts` (`toPublicRoadmap()`), `noindex,nofollow`.

## Antes de implementar uma feature

1. Localize a `taskId` correspondente em `src/product/roadmap.ts`. Se não existir, **crie a task primeiro** — nunca implemente uma feature grande sem uma task registrada.
2. Atualize `status` para `IN_PROGRESS`.
3. Implemente.
4. Verifique cada item de `acceptanceCriteria` de fato — não assuma.
5. Rode os gates: `npm run test:run`, `npm run typecheck`, `npm run build`.
6. Preencha `evidence` com dados reais (commit, testes, deploy) — nunca valores fictícios. Se não houver evidência ainda, deixe o campo vazio.
7. Só então mude `status` para `DONE`. Se a publicação em produção for parte do critério de aceite e ainda não aconteceu, o status **não pode** ser `DONE`.
8. Se travar em algo fora do seu controle, marque `BLOCKED` e explique o motivo em `internalNotes`.

## Regra de DONE

Uma task de código só é `DONE` quando os critérios de aceite dela estiverem realmente satisfeitos — normalmente implementação + testes + typecheck + build, e quando produção fizer parte do critério, também deploy + smoke test. Escrever código não é suficiente.

## Sanitização pública

`toPublicRoadmap()` usa allowlist, não blocklist: cada campo exposto em `/roadmap` é nomeado explicitamente em `publicRoadmap.ts`. Um campo novo em `RoadmapTask`/`RoadmapEvidence` é privado por padrão até alguém deliberadamente adicioná-lo à função de sanitização. Nunca tente esconder algo só via CSS/layout — o payload JSON em si precisa estar limpo. `src/product/publicRoadmap.test.ts` testa isso.

## Escopo CORE vs EXTERNAL

`scope: "EXTERNAL"` significa que a task pertence a outro projeto/repositório (ex.: site de marketing) e nunca entra no progresso técnico deste repo (`coreProgress()` já filtra por `scope: "CORE"`).

## Arquitetura de plataforma (decidida, registrada nas tasks do roadmap)

- **Site de marketing** (`www.marca.com`): projeto externo, fora deste repo (`EXTERNAL-001`).
- **SaaS App** (`app.marca.com`, este repo): auth, Studio, Academy, Admin, produtos, funis, assets, billing da nossa assinatura, roadmap interno, blueprint.
- **Public Funnel Delivery** (`go.marca.com`): entrega os funis publicados aos leads dos clientes. Supabase **não** deve estar no hot path de cada visitante — servir a partir de uma versão publicada imutável + R2/edge cache (ver `PUBLISH-*`).
- **CTA externo**: não somos checkout dos produtos vendidos dentro dos funis. O bloco de CTA é genérico (label + URL) e agnóstico de provedor (Hotmart, Kiwify, Stripe Checkout, WhatsApp, etc.) — ver `CTA-*`.
- **Domínios personalizados**: cliente nunca cria conta Cloudflare nem configura Worker; a plataforma provisiona via Cloudflare for SaaS / Custom Hostnames, MVP focado em subdomínio — ver `DOMAIN-*`.
