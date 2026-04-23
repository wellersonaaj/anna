# Backlog: Material da peça (futuro)

## Decisão atual (Sprint em andamento)

- `material` ainda nao sera campo estruturado no cadastro.
- Quando houver informacao de material (texto da dona ou etiqueta), ela pode influenciar o `nome_sugerido` da IA.
- O foco desta etapa e leitura de etiqueta para `tamanho` e `marca`.

## Objetivo futuro

Adicionar `material` como dado estruturado, pesquisavel e consistente entre API, banco e UI.

## Itens de backlog

1. **Modelagem de dados (Prisma)**
   - Adicionar coluna opcional `material` em `Peca`.
   - Avaliar normalizacao futura (`material` livre vs tabela de referencia).

2. **Contratos de API**
   - Incluir `material` em criacao, detalhe e listagem de itens.
   - Atualizar validacoes Zod para aceitar `material` opcional.

3. **IA de catalogacao**
   - Expandir schema de resposta da visao com campo `material`.
   - Atualizar prompts para extrair composicao da etiqueta com maior confiabilidade.
   - Definir regras de fallback (quando nao houver etiqueta legivel).

4. **Frontend**
   - Exibir/editar campo `material` no fluxo de cadastro com IA.
   - Exibir `material` na tela de detalhe e, se aprovado, em filtros de estoque.

5. **Qualidade e observabilidade**
   - Incluir `material` em metricas de aceitacao/correcao do rascunho IA.
   - Adicionar cenarios de teste manual com etiqueta legivel e ilegivel.

## Criterio de pronto (DoD sugerido)

- `material` persiste no banco e retorna na API.
- Campo aparece no cadastro e detalhe da peca.
- IA preenche `material` quando houver evidencia, sem degradar qualidade de `nome`, `tamanho` e `marca`.
