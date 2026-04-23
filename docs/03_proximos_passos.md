# Proximos Passos (Sprint 0)

> **Indice e status do repo:** [`00_indice_e_status.md`](00_indice_e_status.md) (rotas, env, mapa de código, onde paramos).

## 1) Setup tecnico

- Inicializar monorepo ou estrutura simples (`apps/web` e `apps/api`).
- Instalar Prisma e gerar client.
- Criar primeira migration `init`.

## 2) Regras de dominio primeiro

- Implementar maquina de estados da peca.
- Garantir escrita atomica: atualizar `peca.status` + inserir em `peca_status_historico`.
- Ao vender, apagar `fila_interessados` da peca.

## 3) Auth MVP

- Fluxo OTP por WhatsApp.
- Vinculo dispositivo para WebAuthn.
- Sessao JWT em localStorage no frontend.

## 4) Fluxos P0

- Cadastro de peca (camera + revisao AI).
  - incluir acervo por `tipo + nome`, com sugestao de nomes ja cadastrados.
  - **Parcial:** novo fluxo `/items/new/ai` com rascunho local (foto + texto), `POST /items/analisar-rascunho`, autofill editavel e criacao final da peca ao concluir.
- Estoque com filtros. **Feito:** `GET /items` + UI (status, categoria, busca).
- Fotos: URL manual em `/items/:id` ou fluxo `/items/:id/fotos/upload` (lote texto/voz, presign S3, galeria, câmera com flash quando suportado). **Feito (upload + lote + revisão IA).** `POST /items/:id/fotos/:fotoId/analisar` (OpenAI visão + `AIAnalysis`); botão **Sugerir com IA** no detalhe e no upload por lote. A API lê a imagem via URL pública ou `GetObject` S3 quando a URL bate com o storage configurado (`storageEnv`: `STORAGE_*` ou aliases **`AWS_*`** no Railway). Requer `OPENAI_API_KEY`; opcional `OPENAI_VISION_MODEL`. Presign normaliza MIME (ex. áudio com `;codecs=opus`).
- Fila de interessados na API + tela `/items/:id`. **Feito** (entrada so com peca `DISPONIVEL`).
- Confirmar venda e mover para aguardando entrega.

## 5) Observabilidade minima

- Logging estruturado. **Feito:** log `request_completed` com `reqId`, `brechoId`, rota e status HTTP.
- Tabela `email_job` operante com retries. **Parcial:** `npm run worker:email` (stub marca `ERRO`; substituir por envio real + retries).
- Metricas de uso por brecho.

---

## Checklist rapido antes de implementar qualquer feature

1. Existe referencia no Stitch (`stitch_file_description_submission/`) para essa tela?
2. Campos da UI batem com o Stitch e com o PRD?
3. Contrato da API reflete os campos da UI (sem expor IDs internos)?
4. Regras de integridade do dominio estao preservadas?
5. `npm run lint` e `npm run build` passaram?
6. Documentacao foi atualizada se algo mudou?

> Referencia completa: `lessons.md` na raiz do projeto.
