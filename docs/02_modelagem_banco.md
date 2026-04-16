# Modelagem de Banco - Guia Inicial

Baseado nas secoes 16 e 17 do PRD.

## Premissas

- Banco relacional: PostgreSQL.
- ORM: Prisma.
- Multitenancy por `brecho_id`.
- Historico de status imutavel.
- Integridade forte por constraints.

## Entidades principais

- `brecho`: conta principal.
- `peca`: item unico com status atual.
  - inclui `acervo_tipo` e `acervo_nome` para classificacao operacional e autocomplete.
- `peca_foto`: multiplas fotos e metadados da AI por foto; opcionalmente vinculada a um `peca_foto_lote` (batch de upload com contexto).
- `peca_foto_lote`: contexto do batch — `texto_nota`, `audio_url`, `transcricao_audio` (preenchida apos transcricao); varias fotos podem referenciar o mesmo lote.
- `peca_status_historico`: eventos de transicao (append-only).
- `cliente`: comprador/interessado.
- `venda`: confirmacao de venda (1:1 com peca).
  - `preco_venda`: preço acordado da peça.
  - `frete_valor`: valor numérico do frete (opcional).
  - `ganhos_total`: **total da venda** = `preco_venda` + `frete_valor` (frete somado, não subtraído).
- `entrega`: entrega concluida (1:1 com venda).
- `fila_interessados`: ordenacao por posicao para cada peca.
- `ai_analysis`: predicao completa da AI e contexto textual/audio.
- `email_job`: rastreio de jobs de email.

## Regras de integridade (obrigatorias)

1. `venda.peca_id` deve ser unico.
2. `entrega.venda_id` deve ser unico.
3. `fila_interessados` deve impedir:
   - cliente duplicado na mesma peca;
   - posicao duplicada na mesma peca.
4. `peca_status_historico` nunca sofre update/delete.
5. Ao vender:
   - registrar venda;
   - atualizar status para `VENDIDO`;
   - inserir evento no historico;
   - remover fila da peca.

## Indices sugeridos

- `peca(brecho_id, status, criado_em)`
- `peca(brecho_id, categoria, subcategoria)`
- `peca(brecho_id, acervo_tipo, acervo_nome)`
- `peca_status_historico(peca_id, criado_em)`
- `fila_interessados(peca_id, posicao)`
- `cliente(brecho_id, nome)`

## Estrategia de migracoes

1. `init`:
   - enums base
   - tabelas principais
   - indices e uniques
2. `ai-analysis`:
   - tabela dedicada de analise AI
3. `audit-hardening`:
   - triggers/policies para reforcar imutabilidade e RLS

## Observacoes sobre subcategorias

No MVP, `subcategoria` pode ser `String` com validacao no app (Zod).  
Fase seguinte: transformar em enum por categoria se o catalogo estabilizar.
