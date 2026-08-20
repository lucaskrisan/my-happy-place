# Deploy na Cloudflare Workers

Este projeto usa TanStack Start com o plugin oficial `@cloudflare/vite-plugin`.
O Worker e os assets estaticos sao gerados pelo build Vite; a aplicacao continua
com SSR e rotas TanStack Start, incluindo refresh direto nas rotas.

## Primeira configuracao

1. Crie ou selecione a conta no [dashboard da Cloudflare](https://dash.cloudflare.com/).
2. Abra qualquer pagina da conta e copie o **Account ID**, exibido na barra lateral direita.
3. Em **My Profile > API Tokens**, crie um token customizado e restrinja-o a esta conta.
4. Restrinja o token a esta conta e mantenha somente as permissoes necessarias:
   - **Account > Workers Scripts > Edit**
   - **Account > Workers R2 Storage > Read** para validar o binding `FUNNEL_MEDIA`
   - **Account > Account Settings > Read**
   Nao conceda Workers Routes, Workers Tail, Zone ou Global API Key.
5. No repositorio GitHub, abra **Settings > Secrets and variables > Actions** e crie:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
6. Faca push para `main` ou rode **Actions > Deploy to Cloudflare Workers > Run workflow**.
7. Ao terminar, abra o log do passo `npx wrangler deploy`; ele mostra a URL `workers.dev` criada para o Worker.

## Fluxo automatico

`commit` -> `push main` -> GitHub Actions -> typecheck -> build -> Wrangler -> Workers.

Somente `main` e execucao manual disparam deploy. Pull requests nao recebem secrets
nem executam deploy.

## Comandos locais

Instale as dependencias com `npm ci`.

- Desenvolvimento no runtime Cloudflare: `npm run cloudflare:dev`
- Preview do build no runtime Cloudflare: `npm run build` e depois `npm run cloudflare:preview`
- Deploy manual: `npm run cloudflare:deploy`
- Gerar tipos de bindings: `npm run cloudflare:typegen`
- Acompanhar logs do Worker publicado: `npm run cloudflare:logs`
- Criar o bucket R2 uma unica vez: `npm run media:bucket:create`
- Popular o R2 local a partir de `.local-media/`: `npm run media:seed:local`
- Enviar a midia para o bucket remoto, somente quando solicitado: `npm run media:upload`

Teste no preview as rotas `/`, `/intro`, `/dev` e `/dev/door-scene`, inclusive
atualizando o navegador diretamente em cada URL.

## Midia narrativa em R2

O bucket `my-happy-place-media` e exposto somente pelo Worker, atraves de
`/media/<object-key>`. Nao use URL publica de R2 nos manifests. A rota suporta
GET, HEAD e Range Requests, sem carregar MP4s completos em memoria.

Os quatro MP4s usados no R2 ficam apenas em `.local-media/`, que e ignorada
pelo Git. Para desenvolvimento local, rode `npm run media:seed:local` antes de
`npm run cloudflare:dev`. O upload remoto e intencionalmente separado do deploy
do codigo: `npm run media:upload` nao roda no GitHub Actions.

Os object keys atuais sao semanticos e podem ser substituidos, portanto usam
`Cache-Control: public, max-age=86400`, sem `immutable`. Uma futura versao do
AssetRef devera publicar uma nova key com hash/versionamento em vez de
sobrescrever uma midia publicada.

Para upload manual, prefira um token separado, limitado a
**Account > Workers R2 Storage > Edit** na conta correta. O token de CI nao
precisa ser usado por desenvolvedores para esse fluxo.

## Seguranca

Nao adicione token, Account ID, `.dev.vars` ou arquivos `.wrangler/` ao Git.
As credenciais de CI existem somente nos GitHub Actions Secrets.
