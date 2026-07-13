# PL-330 Companion

Aplicativo web instalável para identificação assistida de emissoras por programação EiBi, diário SWL local-first e acompanhamento de propagação com dados públicos da NOAA SWPC. Correspondências são possibilidades, nunca identificações garantidas.

## Arquitetura

```text
EiBi CSV ─┐                 ┌─ React/Vite PWA ─ IndexedDB (diário e preferências)
          ├─ Worker Hono ───┤
NOAA JSON ┘      │          └─ cache seletivo offline
                 └─ D1 (programação, snapshots e status)
```

O frontend não consulta NOAA repetidamente. O Worker valida fontes heterogêneas, mantém snapshots e serve uma API estável. O diário nunca é enviado ao servidor no MVP.

## Pré-requisitos e execução

- Node.js 22 ou mais recente
- pnpm 10
- conta gratuita Cloudflare para publicar (não exige cartão no fluxo gratuito)

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Frontend: `http://localhost:5173`. API Worker: `http://localhost:8788`.

## D1 e primeira importação

1. Entre na Cloudflare e execute `pnpm wrangler login`.
2. Crie o banco: `pnpm wrangler d1 create pl330-companion`.
3. Copie o `database_id` retornado para `wrangler.jsonc`.
4. Aplique as migrations: `pnpm db:migrate:remote`.
5. Copie `.dev.vars.example` para `.dev.vars` e defina um `ADMIN_SECRET` longo.
6. Com `pnpm dev` ativo, execute:

```bash
ADMIN_SECRET='seu-segredo' pnpm import:eibi:local
```

Para dados fictícios locais, execute `pnpm wrangler d1 execute pl330-companion --local --file scripts/seed-demo.sql`. Esse seed não faz parte das migrations e nunca deve ser aplicado em produção.

## Publicação gratuita

```bash
pnpm build
pnpm wrangler secret put ADMIN_SECRET
pnpm deploy
```

O endereço esperado é `https://pl330-companion.<seu-subdominio>.workers.dev`. Atualize `APP_ORIGIN` em produção para esse endereço. Os crons estão em UTC no `wrangler.jsonc`; o handler mantém o último snapshot válido.

No painel Cloudflare, confira em **Billing > Subscriptions** que apenas o plano Workers Free está ativo; não habilite Workers Paid, R2, Argo, Logpush ou domínio pago. A aplicação usa Static Assets, D1, Workers e Cron Triggers dentro das cotas gratuitas, mas as cotas podem mudar: confira a documentação da Cloudflare antes de publicar grandes bases ou aumentar os crons.

## Backup e privacidade

Em **Diário de escuta**, exporte JSON para backup completo, CSV para análise e restaure somente arquivos validados. O formato atual é versão 2. Nenhuma telemetria, anúncio, login ou cookie de rastreamento é utilizado.

## Atualização e problemas comuns

- EiBi falhou: a versão anterior permanece ativa; confirme certificado/conectividade e execute a importação novamente.
- NOAA falhou: a API continua servindo o último snapshot válido e marca a fonte.
- D1 não encontrado: confira `database_id` e aplique migrations.
- Offline: o diário permanece funcional; pesquisas usam somente resultados já armazenados no cache seletivo.
- PWA não instala em desenvolvimento: use HTTPS ou localhost e aguarde o service worker atualizar.

## Estrutura

```text
apps/web              React, PWA, Dexie e páginas
apps/worker           Hono, EiBi, NOAA e API
packages/shared       schemas, bandas, horários, ranking e geografia
migrations            schema D1 e fixture local
scripts               importação manual
docs                  decisões técnicas e operação
```

## Fontes e custos

- [EiBi](https://www.eibispace.de/) — programação gratuita, com atribuição.
- [NOAA SWPC](https://www.swpc.noaa.gov/) — Kp, F10.7, escalas e alertas públicos.
- Stack integralmente gratuita e de código aberto; licença MIT.

Limitações: sem CAT, contas, sincronização, geocodificação ou previsão garantida. Coordenadas só são usadas quando confiáveis. Consulte `docs/roadmap.md` para a próxima versão.
