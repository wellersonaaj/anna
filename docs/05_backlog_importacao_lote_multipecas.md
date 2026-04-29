# Importação em lote — agrupar fotos por peça

> **Status (MVP):** fluxo principal implementado (inbox, upload com ordem, agrupamento IA com limite de fotos por chamada, revisão de grupos, classificação por grupo via `analisar-rascunho`, revisão de dados, publicação de `Peca`). Evoluções (jobs assíncronos, UX avançada de edição de grupos, métricas operacionais mais ricas) seguem como melhoria contínua.

## Contexto e problema

A operadora pode querer subir **muitas fotos de uma vez** (por exemplo, seleção em massa na galeria). Hoje, o fluxo de cadastro com IA (`/items/new/ai` + `POST /items/analisar-rascunho`) assume que **todas as fotos do rascunho pertencem à mesma peça** — são vários ângulos ou detalhes de **um** item.

Se o lote mistura **várias peças**, não existe etapa que **separe automaticamente** “estas imagens = peça A, aquelas = peça B”. Sem isso, importação em massa fica lenta ou exige que a usuária quebre manualmente o trabalho em vários cadastros.

## Comportamento atual (MVP)

- **Um rascunho = uma peça:** múltiplas fotos alimentam um único rascunho; a IA classifica esse conjunto (pipeline em 2 estágios: extractor + reviewer).
- **Lote em peça já existente:** `peca_foto_lote` agrupa fotos com contexto (texto/voz) **para uma peça já criada**, não resolve “descobrir” quantas peças existem num dump da galeria.

Referências: [`00_indice_e_status.md`](00_indice_e_status.md), implementação do rascunho em `apps/web/src/pages/item-ai-draft.page.tsx` e `POST /items/analisar-rascunho` na API.

## Objetivo da melhoria

Permitir **importação em lote** onde o sistema (com apoio de IA) **propõe grupos de imagens**, cada grupo correspondendo a **uma peça**, e em seguida **reutilizar o fluxo de classificação já existente** por grupo — sem substituir o cadastro rápido “uma peça, N fotos” que o PRD prioriza.

## Pipeline em duas etapas (visão)

1. **Agrupamento (novo):** recebe um conjunto grande de imagens e devolve **clusters** — cada cluster é um candidato a “mesma peça” (mesmo vestuário, continuidade visual, ângulos diferentes, etc.). Implementação futura pode combinar visão comparativa, embeddings, LLM com política de custo/latência; **definição técnica fica para a fase de planejamento**.

2. **Classificação (reuso):** para **cada grupo**, executar o mesmo tipo de lógica já usada no rascunho IA — ou seja, tratar cada grupo como o input atual de `analisar-rascunho` (ou equivalente por grupo), gerar campos sugeridos e permitir revisão antes de persistir **N peças**.

Ordem lógica: **segmentar o lote → classificar peça a peça**.

## Princípios de produto

- **Revisão humana após agrupamento** quando o risco de erro for relevante: confundir duas peças ou fundir duas em uma tem custo operacional alto. A UI deve permitir **ajustar grupos** (mover foto, dividir, fundir) antes de disparar a classificação em massa.
- **Não degradar** o fluxo atual de cadastro rápido: a importação multi-peça é **evolução / modo alternativo**, não obrigatoriedade no caminho feliz de 15s.

## Itens de backlog (áreas)

1. **Produto e UX**
   - Entrada: seleção em massa (galeria) e/ou arrastar muitos arquivos; limites de tamanho e número de imagens alinhados à infra.
   - Tela de **revisão de grupos** antes da classificação.
   - Fluxo de conclusão: criar várias peças a partir dos grupos confirmados (com possibilidade de pausar ou editar uma a uma).

2. **IA — agrupamento**
   - Definir abordagem (ex.: modelo de visão comparando pares, clustering em embeddings, ou agente que propõe partições).
   - Tratamento de incerteza: grupos singleton, sugestão “revisar”, thresholds.

3. **IA — classificação**
   - Reutilizar prompts e contratos do rascunho atual por grupo; alinhar métricas de qualidade (`GET /ai/quality-metrics`) se o volume aumentar.

4. **API e dados**
   - Novos endpoints ou jobs assíncronos se o lote for grande (evitar timeout no mesmo padrão do limite de payload do rascunho).
   - Opcional: entidade de “sessão de importação” com estado intermediário (grupos em revisão) — a modelar no planejamento.

5. **Qualidade**
   - Cenários de teste: mesma peça em fundos diferentes, peças parecidas (cor/tipo), fotos fora de ordem.
   - Telemetria: taxa de correção manual de grupos, tempo até concluir o lote.

## Critério de pronto (DoD sugerido)

- A usuária consegue enviar um lote com **várias peças**, ver **grupos propostos**, **corrigir** grupos se necessário e **gerar uma peça classificada por grupo** com o mesmo nível de revisão que o fluxo atual de rascunho.
- Falhas de agrupamento são **recuperáveis** na UI sem perder o lote inteiro.

## Próximo passo

Detalhamento de arquitetura, custos de IA, e cortes de MVP desta feature: **sessão em modo Plan** (ou documento de design técnico após o plano).
