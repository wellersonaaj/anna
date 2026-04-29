# Anna

Agente vertical para brechó.

**Documentação e status (comece aqui em nova sessão):** [`docs/00_indice_e_status.md`](docs/00_indice_e_status.md)

Este repositório inicia o MVP v1 com foco em:

- operação mobile-first para donas de brechó;
- cadastro rápido de peças com apoio de AI;
- fluxo de venda e entrega com histórico imutável;
- modelagem de dados com Prisma + PostgreSQL.

## Estrutura inicial

- `docs/00_indice_e_status.md`: **índice**, onde paramos, rotas web/API, env (`STORAGE_*` vs `AWS_*`), mapa de arquivos.
- `docs/PRD_Anna_MVP_v1.md`: documento base de requisitos do produto.
- `docs/01_arquitetura_inicial.md`: decisões técnicas iniciais para implementação.
- `docs/02_modelagem_banco.md`: guia de modelagem e regras de integridade.
- `docs/03_proximos_passos.md`: checklist Sprint 0 e pendências.
- `prisma/schema.prisma`: primeira versão do schema relacional.
- `apps/api`: API Fastify + Prisma com fluxos P0.
- `apps/web`: PWA React com estoque (filtros), detalhe da peça (`/items/:id` — fotos e fila), **upload de fotos** (`/items/:id/fotos/upload` — lote, texto/voz, câmera/galeria), cadastro IA (`/items/new/ai` com múltiplas fotos), reserva, venda e entrega.
- `packages/shared`: utilitários compartilhados de domínio (ex.: máquina de status).

## Setup local

1. Instale dependências:
   ```bash
   npm install
   ```
2. Copie as variáveis:
   ```bash
   cp .env.example .env
   ```
3. Gere o Prisma Client:
   ```bash
   npm run db:generate
   ```
4. Aplique as migrations já existentes:
   ```bash
   npm run db:migrate
   ```
5. Rode API e Web em paralelo:
   ```bash
   npm run dev:api
   npm run dev:web
   ```
6. (Opcional) Worker stub de e-mail em outro terminal:
   ```bash
   npm run worker:email
   ```

## Endpoints P0 implementados

- `GET /health`
- `POST /items`
- `GET /items` (filtros opcionais: `?status=&categoria=&search=`)
- `GET /items/:id` (detalhe com `fotos`, `fotoLotes`, `filaInteressados`)
- `POST /items/:id/foto-lotes`, `PATCH .../foto-lotes/:loteId`, `POST .../foto-lotes/:loteId/presign`, `POST .../foto-lotes/:loteId/transcribe`
- `POST /items/:id/fotos` / `DELETE /items/:id/fotos/:fotoId` (body de foto aceita `loteId` opcional; máx. 5 fotos por peça)
- `POST /items/:id/fotos/:fotoId/analisar` (IA visão; persiste `AIAnalysis` + snapshot em `PecaFoto`)
- `POST /items/analisar-rascunho` (IA de rascunho com múltiplas fotos, pipeline em 2 estágios: extractor + reviewer)
- `POST /items/analisar-rascunho/:analysisId/feedback` (feedback in-app com helpfulness + motivos opcionais + diff passivo)
- `GET /ai/quality-metrics?days=30` (métricas de qualidade por campo: null rate, aceitação, helpfulness, motivos)
- `POST /items/:id/fila` / `DELETE /items/:id/fila/:entradaId`
- `GET /acervos/suggestions`
- `GET /clients` (busca opcional `?search=`)
- `POST /clients`
- `GET /clients/:id`
- `POST /items/:id/reserve` (body: `cliente` com nome + WhatsApp ou Instagram)
- `POST /items/:id/sell` (body: `cliente` + `precoVenda` preço da peça + frete; total gravado = peça + frete)
- `GET /sales/pending-delivery`
- `POST /sales/:id/deliver`

> Nota: no MVP técnico atual, o `brecho_id` é passado no header `x-brecho-id`.

### Upload de imagens (presigned)

Configure storage no `.env` da API (ver `.env.example`). A API aceita **`STORAGE_*`** ou **aliases `AWS_*`** (`AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, região via `AWS_DEFAULT_REGION` / `AWS_REGION`; URL pública opcional via `STORAGE_PUBLIC_BASE_URL` ou `AWS_S3_PUBLIC_BASE_URL`). Detalhes: [`docs/00_indice_e_status.md`](docs/00_indice_e_status.md).

O bucket precisa permitir `PUT` via URL assinada e o navegador precisa de **CORS** no bucket permitindo o origin do `apps/web` (método `PUT`, headers `Content-Type`).

Transcrição de voz no lote e análise de foto usam `OPENAI_API_KEY` (opcional para transcrição; necessária para IA de foto). Opcional: `OPENAI_VISION_MODEL`.

No cadastro IA (`/items/new/ai`), a análise usa múltiplas fotos + contexto em texto e aplica:

- inferência em 2 estágios (extractor e reviewer);
- `field_confidence` por campo crítico;
- fallback determinístico para reduzir `null` em `nome`, `subcategoria` e `cor`;
- coleta de feedback in-app para ciclo contínuo de melhoria.
