# Lessons Learned - Anna

Este arquivo registra regras operacionais para evitar retrabalho e manter o desenvolvimento alinhado com o que ja foi definido no projeto.

## Regra 1: Nao reinventar UX ja definida

- Antes de implementar qualquer fluxo, conferir os arquivos em `stitch_file_description_submission/`.
- Se a tela/fluxo ja existe no Stitch, implementar fielmente o comportamento e os campos definidos.
- Nao introduzir campos tecnicos na UI (ex.: `clienteId`) quando a UX define campos de negocio (nome, WhatsApp, Instagram).

## Regra 2: Docs sao fonte de verdade

- Validar sempre `docs/PRD_Anna_MVP_v1.md`, `docs/01_arquitetura_inicial.md`, `docs/02_modelagem_banco.md` e `docs/03_proximos_passos.md` antes de codar.
- Se houver divergencia entre implementacao e docs, corrigir implementacao ou atualizar docs no mesmo ciclo.
- Nenhuma regra de dominio deve nascer apenas "na hora"; precisa estar refletida em documentacao.

## Regra 3: Fluxo vertical completo antes de refinamentos

- Implementar por fluxo de negocio ponta a ponta (ex.: reservar -> vender -> entregar), nao por campos isolados.
- Validar integridade entre UI, API e banco no mesmo fluxo.
- So depois aplicar refinamentos visuais e microinteracoes.

## Regra 4: Modelo mental correto de dados

- IDs internos sao responsabilidade da API, nao da usuaria.
- A UI trabalha com dados de negocio compreensiveis.
- API deve resolver mapeamentos internos (ex.: buscar/criar cliente e vincular por id internamente).

## Regra 5: Checklist obrigatorio antes de merge

1. Existe referencia no Stitch para a tela?
2. Campos da UI batem com o Stitch e PRD?
3. Contrato da API bate com os campos da UI?
4. Regras de integridade do dominio estao preservadas?
5. `lint` e `build` passaram?
6. Documentacao foi atualizada se algo mudou?

## Regra 6: Evitar erros recorrentes observados

- Nao usar `clienteId` em formularios da usuaria.
- Nao assumir `brechoId` inexistente.
- Nao pular validacoes minimas de fluxo critico (reserva, venda, entrega).
- Nao criar comportamento novo sem verificar se ja existe definicao no Stitch/docs.

## Definicao de pronto (DoD) para cada feature

- Comportamento alinhado ao Stitch.
- Regras alinhadas ao PRD/arquitetura/modelagem.
- Fluxo funcional ponta a ponta.
- Erros criticos tratados (validacao e mensagens claras).
- Build e lint sem erros.
