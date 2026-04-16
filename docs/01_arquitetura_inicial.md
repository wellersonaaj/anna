# Arquitetura Inicial - Anna MVP

Este documento registra decisoes tecnicas iniciais para reduzir retrabalho no MVP.

## Objetivo

Entregar rapidamente os fluxos P0 com base robusta de dados e regras de negocio:

- cadastro de peca com AI;
- reserva, venda e entrega;
- historico imutavel de status;
- CRM leve de clientes;
- fila de interessados por peca.

## Stack

### Frontend

- React + Vite + TypeScript
- Tailwind CSS
- TanStack Query
- React Router v6
- Zustand (sessao/local state global)
- React Hook Form + Zod

### Backend

- Node.js + Fastify (MVP) ou NestJS (caso queira estrutura mais rigida)
- Prisma ORM
- PostgreSQL
- BullMQ + Redis (jobs de email e IA assincronos)

## Principios arquiteturais

- **Dominio primeiro**: separar modulos por contexto (`peca`, `cliente`, `venda`, `fila`, `auth`).
- **API stateless com JWT**: `brecho_id` sempre extraido do token.
- **Historico imutavel**: eventos de status nao sao editados/deletados.
- **Assincrono por padrao**: analise AI e envio de email fora da request principal.
- **Mobile-first**: UX desenhada para uma mao e baixissima friccao.

## Layout sugerido de pastas

```txt
anna/
  docs/
  prisma/
  apps/
    web/
    api/
  packages/
    shared-types/
```

## Contratos de API (v1 sugerido)

- `POST /items` criar peca
- `GET /items` listar pecas (query opcional: `status`, `categoria`, `search`)
- `GET /items/:id` detalhe (inclui `fotos` com `lote`, `fotoLotes`, `filaInteressados`, historico, venda)
- `POST /items/:id/foto-lotes` corpo `{ "textoNota?" }` — cria **lote** de contexto (batch) para texto/voz + uploads
- `PATCH /items/:id/foto-lotes/:loteId` corpo `{ "textoNota?", "audioUrl?" }` (ao menos um campo)
- `POST /items/:id/foto-lotes/:loteId/presign` corpo `{ "tipo": "imagem"|"audio", "contentType", "extensao", "tamanhoBytes?" }` — retorna `uploadUrl` + `publicUrl` (S3 compativel; requer `STORAGE_*` na API)
- `POST /items/:id/foto-lotes/:loteId/transcribe` — preenche `transcricaoAudio` via OpenAI Whisper (`OPENAI_API_KEY`)
- `POST /items/:id/fotos` corpo `{ "url", "ordem?", "loteId?" }` (max 5 fotos por peca; `loteId` opcional para vincular ao batch)
- `DELETE /items/:id/fotos/:fotoId`
- `POST /items/:id/fila` corpo `{ "cliente": { ... } }` (so peca `DISPONIVEL`; cliente unico por peca na fila)
- `DELETE /items/:id/fila/:entradaId`
- `GET /acervos/suggestions` listar nomes de acervo por prefixo/tipo
- `GET /clients` listar/buscar clientes (`?search=` opcional)
- `POST /clients` criar ou reutilizar cliente (mesma regra de contato)
- `GET /clients/:id` detalhe do cliente com historico de compras (`vendas` + `peca`)
- `POST /items/:id/reserve` corpo `{ "cliente": { "nome", "whatsapp?", "instagram?" } }` (ao menos um contato)
- `POST /items/:id/sell` corpo `{ "cliente": { ... }, "precoVenda", "freteTexto?", "freteValor?" }` — `precoVenda` é o preço da peça; `ganhosTotal` persistido = `precoVenda` + `freteValor` (frete somado).
- `POST /sales/:id/deliver`
- `POST /reports/email`

## Criticos de consistencia

- Nao permitir duas vendas para a mesma peca.
- Nao permitir entrega sem venda.
- Ao vender, remover fila de interessados da peca.
- Toda transicao de status deve gerar evento em historico.

## Observabilidade minima

- Logs estruturados: cada resposta registra `reqId` (ou header `x-request-id`), `brechoId`, metodo, URL e `statusCode` (evento `request_completed` no logger Pino).
- Worker opcional `npm run worker:email`: processa `EmailJob` pendentes com stub (marca `PROCESSANDO` depois `ERRO` ate existir provedor real).
- Metricas basicas (futuro): cadastros/dia, reservas abertas, taxa reserva->venda, tempo medio de entrega.
