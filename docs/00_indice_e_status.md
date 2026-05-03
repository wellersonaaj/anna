# Indice e status do projeto Anna

Documento de entrada para **onboarding** e para **retomar contexto** em nova sessão. Atualize este arquivo quando mudar fluxo crítico, env obrigatório ou estado do MVP.

---

## Onde paramos (resumo executivo)

- **Monorepo:** `apps/api` (Fastify + Prisma), `apps/web` (React + Vite), `prisma/`, `packages/shared`.
- **Produção típica:** API em PaaS (ex.: Railway), front com `VITE_API_URL` apontando para a API; chamadas privadas usam `Authorization: Bearer <token>` e o `brechoId` vem da sessão validada.
- **Multitenancy/admin:** o primeiro corte usa login simples (`telefone + senha`), JWT e painel fundador em `/admin/brechos` para criar brechós, donas/equipe e senha provisória. OTP/WebAuthn ficam em backlog.
- **Fotos e storage:** upload via presign S3-compatible. A API aceita **`STORAGE_*`** ou **aliases `AWS_*`** (comum no Railway): ver secção [Variáveis de ambiente](#variáveis-de-ambiente) e [`apps/api/src/config/env.ts`](../apps/api/src/config/env.ts) (`storageEnv`).
- **IA em foto:** `POST /items/:id/fotos/:fotoId/analisar` — OpenAI visão, grava `AIAnalysis` + snapshot em `PecaFoto`. Requer `OPENAI_API_KEY`; opcional `OPENAI_VISION_MODEL` (default `gpt-4o-mini`).
- **Cadastro com IA (rascunho local):** rota web `/items/new/ai` com múltiplas fotos + texto opcional, análise em **2 estágios** (extractor + reviewer), `detail: high`, autofill com fallback, criação do item ao concluir e feedback in-app com motivos.
- **Cadastro IA no web (`/items/new/ai`) — comportamento atual:** abertura prioritária da câmera (`getUserMedia`); a stream é associada ao `<video>` **depois** que o overlay de câmera monta no DOM (evita preview preto em iOS/desktop). O rascunho **não** é mais persistido em `localStorage` entre visitas: ao entrar na rota o estado inicia limpo. Várias fotos por cadastro; `POST /items/analisar-rascunho` aceita várias imagens e aplica limite técnico de **tamanho total** do payload de base64 (aprox. 32 MB) para evitar falhas/timeouts. No overlay: após cada captura há **flash** visual curto, **vibração** opcional (`navigator.vibrate`), **contagem** com pluralização (“Nenhuma foto” / “1 foto” / “N fotos”), **miniatura da última foto** no rodapé e botão **Revisar fotos** que fecha a câmera e rola até a seção de fotos/contexto (`#ai-draft-fotos-section`). Implementação principal: [`apps/web/src/pages/item-ai-draft.page.tsx`](../apps/web/src/pages/item-ai-draft.page.tsx); store sem persist: [`apps/web/src/store/item-ai-draft.store.ts`](../apps/web/src/store/item-ai-draft.store.ts); validação do corpo: [`apps/api/src/modules/items/item.schemas.ts`](../apps/api/src/modules/items/item.schemas.ts) (`analyzeItemDraftSchema`).
- **Etiqueta no rascunho IA:** quando legível, a IA agora sugere `tamanho` e `marca` automaticamente no fluxo `/items/new/ai`. `material` segue sem campo estruturado nesta fase, influenciando apenas o `nome_sugerido` via contexto.
- **Correções recentes (Sprint fotos/IA):** normalização de `Content-Type` no presign (ex.: `audio/webm;codecs=opus` → `audio/webm`); feedback “Texto salvo.” no lote; mensagens de validação Zod no cliente; leitura de imagem para IA via `fetch` ou `GetObject` quando a URL bate com o storage configurado.
- **Importação multipeças (MVP):** inbox `/importacoes`, fluxo em etapas (fotos → grupos com IA e ordem de envio → confirmar → classificar com `analisar-rascunho` por grupo → revisar → publicar `Peca` + fotos). API em `apps/api/src/modules/importacoes/`. Migração: `20260429190000_importacao_multipiece`. Detalhes e limites: [`05_backlog_importacao_lote_multipecas.md`](05_backlog_importacao_lote_multipecas.md).

Pendências e próximos passos detalhados: [`03_proximos_passos.md`](03_proximos_passos.md).

---

## Indice da documentação

| Documento | Conteúdo |
|-----------|-----------|
| [PRD_Anna_MVP_v1.md](PRD_Anna_MVP_v1.md) | Requisitos de produto, fluxos, JSON da IA, enums. |
| [01_arquitetura_inicial.md](01_arquitetura_inicial.md) | Decisões técnicas iniciais. |
| [02_modelagem_banco.md](02_modelagem_banco.md) | Modelo relacional e integridade. |
| [03_proximos_passos.md](03_proximos_passos.md) | Checklist Sprint 0, o que está feito / parcial / falta. |
| [04_backlog_material.md](04_backlog_material.md) | Backlog para evoluir `material` para campo estruturado. |
| [05_backlog_importacao_lote_multipecas.md](05_backlog_importacao_lote_multipecas.md) | Backlog: lote com várias peças — agrupar fotos, depois classificar (reuso do rascunho IA). |
| [06_multitenancy_acesso_brechos.md](06_multitenancy_acesso_brechos.md) | Desenho de UX, banco, API e rollout para acesso segregado por brechó. |
| [lessons.md](../lessons.md) (raiz) | Lições e convenções do time. |

Este arquivo (**00**) é o **hub**: índice + status + ponteiros para código e env.

---

## Rotas do frontend (SPA)

Base: origem onde o `apps/web` está hospedado. Paths principais:

| Path | Tela / função |
|------|----------------|
| `/` | Estoque (lista, cadastro rápido, link “Fotos / fila” por peça, banner/importações pendentes, atalho Importações). |
| `/items/new` | Escolha de cadastro: uma peça com IA, manual ou **importação multipeças**. |
| `/items/new/ai` | Cadastro ultra-rápido: câmera-first, várias fotos, contexto opcional, sugestão IA, revisão e conclusão (flash/contagem/miniatura no overlay; sem rascunho persistido entre visitas). |
| `/importacoes` | Inbox de importações (lotes). |
| `/importacoes/criar` e `/importacoes/:loteId/criar` | Envio de fotos do lote (presign S3, ordem original). |
| `/importacoes/:loteId/grupos` | Revisão 1: grupos (IA + ajuste manual). |
| `/importacoes/:loteId/rascunhos` | Classificação IA por grupo e lista de rascunhos. |
| `/importacoes/:loteId/rascunhos/:rascunhoId` | Revisão 2: dados e publicação no estoque. |
| `/items/:itemId` | Detalhe da peça: fotos (URL manual ou link para upload), fila, **Sugerir com IA** por foto. |
| `/items/:itemId/fotos/upload` | Fluxo de lote: nota texto/voz, presign, galeria/câmera, fotos do lote, **Sugerir com IA**. |
| `/reserve/:itemId` | Reserva. |
| `/sell/:itemId` | Venda. |
| `/vendas` | Hub de vendas (Reservados, Aguardando entrega, Entregues 30 dias + ver mais). |
| `/deliveries` | Entregas pendentes. |
| `/clientes` | Lista de clientes (casca visual inicial). |
| `/clientes/:clientId` | Detalhe de cliente com histórico de compras. |
| `/relatorios` | Relatórios (casca visual inicial). |
| `/ai/quality` | Métricas de qualidade da IA (null rate, aceitação, helpfulness, motivos). |

Router: [`apps/web/src/app.tsx`](../apps/web/src/app.tsx).

---

## Endpoints da API (referência rápida)

Header: `x-brecho-id` (MVP). JSON salvo nas rotas de escrita.

**Itens e fotos**

- `POST /items`, `GET /items`, `GET /items/:id` (inclui última `aiAnalyses` por foto, `take: 1`).
- `POST /items/analisar-rascunho` (IA de rascunho com múltiplas fotos sem item prévio; usado no fluxo `/items/new/ai`)
- `POST /items/analisar-rascunho/:analysisId/feedback` (feedback in-app + diff passivo do resultado final)
- `GET /ai/quality-metrics?days=30` (métricas agregadas de qualidade da IA por período)
- `POST /items/:id/foto-lotes`, `PATCH /items/:id/foto-lotes/:loteId`
- `POST /items/:id/foto-lotes/:loteId/presign` (body: `tipo`, `contentType`, `extensao`, `tamanhoBytes` opcional)
- `POST /items/:id/foto-lotes/:loteId/transcribe` (Whisper; `OPENAI_API_KEY`)
- `POST /items/:id/fotos`, `DELETE /items/:id/fotos/:fotoId`
- `POST /items/:id/fotos/:fotoId/analisar` (IA visão)

**Importações (multipeças)**

- `POST /importacoes`, `GET /importacoes`, `GET /importacoes/metricas/resumo`, `GET /importacoes/pendentes/count`, `GET /importacoes/:loteId`
- `POST /importacoes/:loteId/fotos/presign`, `POST /importacoes/:loteId/fotos`, `POST /importacoes/:loteId/agrupar`, `PATCH /importacoes/:loteId/grupos`, `POST /importacoes/:loteId/grupos/confirmar`, `POST /importacoes/:loteId/classificar`
- `PATCH /importacoes/:loteId/rascunhos/:rascunhoId`, `POST /importacoes/:loteId/rascunhos/:rascunhoId/publicar`

**Fila, venda, entrega, acervo, health:** ver lista completa no [`README.md`](../README.md) na raiz.

Implementação principal das rotas de item: [`apps/api/src/modules/items/item.routes.ts`](../apps/api/src/modules/items/item.routes.ts).

---

## Variáveis de ambiente

Referência comentada: [`.env.example`](../.env.example) na raiz.

### API — banco e servidor

- `DATABASE_URL` (obrigatório)
- `API_HOST`, `API_PORT` ou `PORT` (PaaS costuma injetar `PORT`)

### API — storage (presign + leitura para IA)

Preencha **ou** o grupo `STORAGE_*` **ou** os aliases **`AWS_*`** (mesmos valores; nomes diferentes):

| Uso | `STORAGE_*` | Alias `AWS_*` (ex. Railway) |
|-----|-------------|-----------------------------|
| Endpoint S3-compatible | `STORAGE_ENDPOINT` | `AWS_ENDPOINT_URL` |
| Access key | `STORAGE_ACCESS_KEY` | `AWS_ACCESS_KEY_ID` |
| Secret | `STORAGE_SECRET_KEY` | `AWS_SECRET_ACCESS_KEY` |
| Bucket | `STORAGE_BUCKET` | `AWS_S3_BUCKET_NAME` |
| Região | `STORAGE_REGION` | `AWS_DEFAULT_REGION` ou `AWS_REGION` |
| URL pública / CDN (opcional) | `STORAGE_PUBLIC_BASE_URL` | `AWS_S3_PUBLIC_BASE_URL` |

Resolução unificada em código: `storageEnv` em [`apps/api/src/config/env.ts`](../apps/api/src/config/env.ts). Leitura de objeto privado + URL pública: [`apps/api/src/lib/storage.ts`](../apps/api/src/lib/storage.ts).

### API — OpenAI

- `OPENAI_API_KEY` — transcrição de áudio do lote + análise de foto.
- `OPENAI_VISION_MODEL` (opcional) — default `gpt-4o-mini`.

### Web

- `VITE_API_URL` — base URL da API (ex.: `https://annaapi-production...`).
- `JWT_SECRET` — segredo para assinar sessão JWT.
- `FOUNDER_BOOTSTRAP_PHONE` / `FOUNDER_BOOTSTRAP_PASSWORD` — com ambos preenchidos, a API aplica o fundador no **arranque** (`apps/api/src/lib/founderBootstrap.ts` + `server.ts`); o script `npm run seed:founder -w @anna/api` continua opcional. `FOUNDER_BOOTSTRAP_DISABLE_ON_START=true` desliga o bootstrap no start.

---

## Arquivos-chave no código (mapa rápido)

| Área | Arquivo |
|------|---------|
| Env + `storageEnv` | `apps/api/src/config/env.ts` |
| Bootstrap fundador (env → DB) | `apps/api/src/lib/founderBootstrap.ts` |
| S3 presign / GetObject / URL pública | `apps/api/src/lib/storage.ts` |
| Prompt + Zod + chamada visão | `apps/api/src/lib/openaiVision.ts` |
| Regras de negócio itens/fotos/IA | `apps/api/src/modules/items/item.service.ts` |
| Rotas + `handleError` | `apps/api/src/modules/items/item.routes.ts` |
| Validação presign (MIME normalizado) | `apps/api/src/modules/items/item.schemas.ts` |
| Client HTTP + erros com `issues` | `apps/web/src/api/client.ts` |
| API items (incl. análise de rascunho multi-foto + feedback) | `apps/web/src/api/items.ts` |
| Estado do rascunho IA (Zustand, sem `persist` em storage) | `apps/web/src/store/item-ai-draft.store.ts` |
| Página cadastro IA (câmera-first, overlay, UX de captura) | `apps/web/src/pages/item-ai-draft.page.tsx` |
| Pipeline de visão 2 estágios + prompt | `apps/api/src/lib/openaiVision.ts` |
| Persistência estendida de análise/feedback | `prisma/schema.prisma` (`AIDraftAnalysis`, `AIDraftFeedback`) |
| Upload lote + IA | `apps/web/src/pages/item-foto-upload.page.tsx` |
| Detalhe peça + fotos | `apps/web/src/pages/item-detail.page.tsx` |
| Card sugestões IA | `apps/web/src/components/foto-ai-suggestions.tsx` |
| Schema Prisma | `prisma/schema.prisma` |

---

## Comandos úteis

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev:api    # API
npm run dev:web    # Front
npm run seed:founder -w @anna/api
npm run analytics:daily -w @anna/api
npm run worker:email
```

Build de verificação: `npm run build` na raiz (se existir) ou em `apps/api` e `apps/web` individualmente.

---

## Checklist antes de encerrar uma feature

Reutilizar o checklist em [`03_proximos_passos.md`](03_proximos_passos.md) (final do arquivo). Se alterar env, rotas ou fluxo de fotos/IA, **atualizar este 00** e o **README** se necessário.
