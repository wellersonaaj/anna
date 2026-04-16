# Anna — Agente Vertical para Brechó

Documento de requisitos para prototipagem e desenvolvimento do MVP v1.

Autores: Wellerson & Catia  
Ano: 2025

---

## 1. Visao do produto

> "Nao e um ERP. E um agente vertical para brecho."

Problema central: operacao de brecho com peca unica, equipe pequena, vendas via Instagram/WhatsApp e fluxo manual suscetivel a erro (venda dupla, cadastro lento, pos-venda inconsistente).

### Interface

- PWA mobile-first, responsivo.
- Sem instalacao obrigatoria por loja de apps.
- Autenticacao biometrica via WebAuthn no dia a dia.

### Metas de UX

- Cadastro de peca em ate 15s.
- Baixa de venda em ate 10s.
- Interface limpa, sem burocracia.

## 2. ICP (perfil ideal)

### Quem e

- Dona de brecho (25-40), operacao solo ou mini equipe.
- Vende por Instagram Stories e WhatsApp.
- 20 a 500 vendas/mes.
- Usa celular como ferramenta principal.

### Quem nao e (anti-persona)

- Hobby sem intencao de crescer.
- Negocio satisfeito com planilha.
- Varejo grande com demanda de ERP robusto.

## 3. Fluxos principais

### 3.1 Cadastro de peca (meta 15s)

1. Abrir app e tocar em "+ Cadastrar".
2. Capturar foto ou selecionar da galeria.
3. AI analisa em < 3s.
4. Revisar campos pre-preenchidos.
5. Salvar peca com status inicial `Disponivel`.

Campos:

- Obrigatorios: foto, nome, categoria, cor/estampa, condicao, tamanho.
- Opcionais: marca, preco de venda, acervo, tabela de medidas.
- Acervo (MVP): `tipo` (proprio/consignado) e `nome do acervo` com sugestao automatica baseada nos nomes ja usados no mesmo brecho.

### 3.2 Estoque vivo

- Lista com thumbnail, nome, categoria, status.
- Filtros por status e categoria.
- Busca por texto.
- Toque no item abre detalhe.

### 3.3 Status e transicoes

- `Disponivel` -> `Reservado` | `Vendido` | `Indisponivel`
- `Reservado` -> `Vendido` | `Disponivel`
- `Vendido` -> `Entregue`
- `Entregue` -> (fim de ciclo)
- `Indisponivel` -> `Disponivel`

### 3.4 Baixa rapida (meta 10s)

- Caminho direto: buscar peca -> vender -> confirmar preco/frete -> status `Vendido`.
- Caminho com reserva: reservar com cliente -> confirmar venda depois.

### 3.5 Fila de reservados

- Tela dedicada (nao e so filtro do estoque).
- Lista com cliente vinculado e timer de reserva.
- Acoes: `Vender`, `Avisar no WhatsApp`, `Liberar`.
- Sem timeout automatico.

### 3.6 Modulo de entrega

- Lista de vendidas aguardando envio.
- Acao de marcar entregue com codigo de rastreio opcional.

### 3.7 Cadastro de clientes

- Criado automaticamente ao reservar/vender.
- Campos: nome (obrigatorio), WhatsApp ou Instagram (ao menos um), historico de compras automatico.

## 4. Metadados de AI

Exibidos para usuaria:

- Categoria, cor principal, condicao estimada, nome sugerido.

Internos:

- Ambiente da foto, qualidade da imagem, multiplas pecas, confianca.

Observacao: metadados internos nao sao exibidos no MVP.

## 5. Telas a prototipar no Stitch

- Login/Onboarding
- Home/Estoque
- Cadastro (camera)
- Cadastro (revisao AI)
- Detalhe da peca
- Reservar
- Confirmar venda
- Fila de reservados
- Marcar como entregue
- Clientes
- Relatorio basico

## 6. Monetizacao

- Basico: R$39 (ate 50 cadastros/mes)
- Medio: R$69 (ate 150)
- Pro: R$129 (ate 400)
- Trial: 30 dias sem cartao (clientes estrategicos)

Regras: sem setup fee, excedente proporcional no ciclo seguinte, monitorar custo de AI por conta.

## 7. Fora do escopo MVP

- Integracao automatica com Instagram.
- Gestao de DM/fila de vendas.
- Precificacao por AI.
- Dashboard avancado.
- Marketplace/B2C.
- Integracoes Enjoei/Nuvemshop.
- App nativo.

## 8. Prompt para Google Stitch

Gerar PWA mobile-first com visual limpo, destaque rosa/vermelho `#FF4D6D`, status coloridos, e telas priorizadas para cadastro, estoque e confirmacao de venda.

## 9. Notas para prototipo

Prioridades:

- P0: cadastro (camera + revisao AI), estoque, baixa rapida.
- P1: reservados, entrega, detalhe.
- P2: clientes, relatorio, login.

Validacoes-chave:

- Cadastro em 15s e baixa em 3 toques.
- Leitura visual de status.
- Fila de reservados reduz ansiedade operacional.

## 10. Especificacoes tecnicas (auth/sessao)

### Modelo de acesso

- Sem self-service de cadastro.
- Fundadores cadastram brecho manualmente.
- Envio de link e codigo inicial por WhatsApp.

### Estados de login

1. Primeiro acesso/dispositivo novo: telefone -> OTP WhatsApp -> opcao de ativar WebAuthn.
2. Dispositivo conhecido: token em localStorage -> "Entrar com biometria".

### Sessao

- JWT em localStorage (nao cookie).
- Limpeza de dados retorna ao fluxo OTP.

### Componente de fotos

- Ate 5 fotos por peca.
- Primeira foto e principal.
- Reordenacao por drag and drop.
- Upload/acompanhamento de analise AI em background.
- Contexto adicional opcional: texto e audio.

### Historico de status

- Tabela de eventos imutavel.
- Sem estados futuros "pendentes".

### Camera

- Overlay estatico de enquadramento (SVG).
- Analise AI so apos captura.

### Bottom navigation

- Estoque, Vendas, +, Clientes, Relatorios.
- Presente nas telas principais; ausente em fluxos fechados.

### Estoque

- Grid 2 colunas uniforme (4:5), sem variao.
- Vendido/Entregue ficam na tela de Vendas.
- Filtros por status/categoria e busca textual.

### Vendas

- Secoes na mesma tela: Reservados -> Aguardando Entrega -> Entregues.

### Confirmar venda

- Fluxo fechado sem navbar.
- Campo **Preço da peça** (editável; pré-preenchido com o preço de anúncio quando existir).
- Frete em texto livre; o valor numérico do frete é **somado** ao preço da peça.
- **Total da venda** = preço da peça + frete (valor do frete extraído do texto quando possível).

## 11. Tela de Vendas (detalhada)

### Secao Reservados

- Ordenacao por mais antigo.
- Timer por tempo decorrido (cinza/amarelo/vermelho).
- Badge urgente >24h.
- Acoes: vender, avisar no WhatsApp, liberar.

### Secao Aguardando Entrega

- Vendidas ainda nao entregues.
- Ordenacao por mais antigo.
- Acao principal: marcar como entregue.

### Secao Entregues

- Historico somente leitura.
- Mais recente primeiro.
- Ultimos 30 dias por padrao + "Ver mais".

## 12. Tela de Clientes (detalhada)

- Lista com busca por nome, mais recente primeiro.
- Avatar por inicial, icones de contato, badge de compras.
- Detalhe com historico de compras e resumo gasto.
- Edicao de dados de contato.

## 13. Tela de Relatorios (detalhada)

Cards principais:

1. Pecas em estoque (disponivel+reservado+indisponivel)
2. Vendidas no mes (vendido+entregue no mes corrente)
3. Faturamento bruto do mes
4. Paradas ha +30 dias

Inclui lista de pecas paradas e acao "Enviar historico por e-mail" (fire-and-forget).

## 14. Modal Marcar como Entregue

- Bottom sheet com resumo da peca/cliente.
- Campo opcional de codigo de rastreio.
- Confirmacao altera status para `Entregue` e grava historico.

## 15. Sistema de fila de interessados

- Fila por peca reservada.
- Sem limite de pessoas.
- Ao vender a peca, fila e descartada.
- Tela dedicada com reorder drag-and-drop e acoes com "Desfazer" de 3s.
- Fluxo especial ao liberar item com fila ativa (passar para proximo ou liberar geral).
- Regra global: botao WhatsApp sempre visivel; se nao houver numero, pedir e salvar na hora.

## 16. Guia de desenvolvimento (boas praticas e decisoes)

### Stack recomendada

Frontend:

- React + Vite
- Tailwind CSS
- TanStack Query
- React Router v6
- Zustand
- React Hook Form + Zod
- @dnd-kit
- date-fns

Backend:

- Node.js + Fastify ou NestJS
- PostgreSQL
- Prisma
- BullMQ + Redis
- Resend ou SendGrid

Servicos externos:

- OpenAI Vision (GPT-4o) ou Gemini Vision
- Twilio (OTP WhatsApp)
- Supabase Storage ou Cloudflare R2
- Links nativos para WhatsApp/Instagram
- Deploy em Vercel ou Railway

### Arquitetura por dominio

- Dominio Peca: `ItemCard`, `ItemStatusBadge`, `ItemPhoto`, `ItemStatusHistory`, hooks de lista e detalhe.
- Dominio Cliente: avatar, botoes de contato, item de lista, hooks de cliente e WhatsApp.
- Dominio Fila: item/lista com DnD, snackbar de desfazer, hook de fila.
- Dominio Venda: sheets de confirmacao e hook de calculo do total (preco da peca + frete).
- Globais: `BottomNav`, `PageHeader`, `EmptyState`, `TimerBadge`, `SectionHeader`.

### Regras de estado e dados

- React Query para fetch/mutations.
- `staleTime`: 30s listas, 60s detalhe.
- Invalidacao de cache apos mudanca de status.
- Otimistic updates para status.
- Formularios com RHF + Zod.
- Erro de rede via toast discreto.
- Timeout de 10s para evitar loading infinito.

### Regras de e-mail

- Sempre assincrono via fila (BullMQ), resposta `202 Accepted`.
- Retry 3x com backoff exponencial.
- Nao bloquear UI.

### Regras de analise de foto

- Redimensionar imagem no frontend (800px max, qualidade 85%).
- Upload e analise independentes.
- Se houver audio: transcrever primeiro e analisar com contexto completo.
- Timeout de analise: 8s com fallback manual.
- Persistir predicao original da AI, mesmo com edicoes da usuaria.

### UX e performance

- Mobile-first (390x844 e 360x800).
- Botoes >= 48px e fonte >= 14px (inputs >= 16px iOS).
- Lazy loading de imagens.
- Virtualizacao para >100 itens.
- Paginacao 20 itens.
- Service Worker para cache de assets.
- Toast unico por vez.

### Modelo de dados (referencia)

Tabelas essenciais:

- `brecho`
- `peca`
- `peca_foto`
- `peca_status_historico` (imutavel)
- `cliente`
- `venda`
- `entrega`
- `fila_interessados` (descartar ao vender)
- `email_job`

### Seguranca minima MVP

- JWT em toda rota (extrair `brecho_id` do token).
- RLS por brecho no PostgreSQL/Supabase.
- Validar upload (jpeg/png, max 5MB).
- OTP expira em 10 min, uso unico, max 3 tentativas.
- Nao commitar segredos.
- CORS restrito ao dominio de producao.

### Painel admin fundadores

- Cadastrar brecho e trial/plano.
- Disparar WhatsApp de primeiro acesso.
- Monitorar uso mensal e consumo de AI.
- Implementacao separada (Retool/AdminJS/React).

## 17. Schema JSON de resposta da AI (analise de peca)

### Prompt de sistema

```txt
Voce e um assistente especializado em analise de roupas e acessorios de brecho.
Analise a imagem fornecida e retorne APENAS um objeto JSON valido, sem markdown, sem explicacoes.
Use exatamente os valores permitidos para cada campo enum.
Se nao conseguir identificar um campo com confianca, use null.
```

### Prompt de usuario (dinamico)

```txt
Analise esta peca de roupa/acessorio.

[CONTEXTO ADICIONAL DA DONA — se fornecido]:
Texto: "{texto_livre}"
Transcricao de audio: "{transcricao_audio}"

Retorne o JSON com a analise completa.
```

### Exemplo de resposta esperada

```json
{
  "nome_sugerido": "Saia rodada floral",
  "categoria": "roupa_feminina",
  "subcategoria": "saias",
  "cor_principal": "rosa",
  "estampado": true,
  "descricao_estampa": "floral",
  "condicao": "otimo",
  "confianca": 0.92,
  "ambiente_foto": "cabide",
  "qualidade_foto": "alta",
  "multiplas_pecas": false,
  "observacoes": "Tecido leve, aparenta ser viscose ou chiffon. Comprimento midi."
}
```

### Enums validos

- `categoria`: `roupa_feminina | roupa_masculina | calcado | acessorio`
- `condicao`: `otimo | bom | regular`
- `ambiente_foto`: `manequim | cama | chao | cabide | corpo | outro | escuro`
- `qualidade_foto`: `alta | media | baixa`
- `subcategoria`: conforme categoria (listas fechadas do documento)

### Tipo TypeScript de referencia

```ts
export type AIAnalysisResponse = {
  nome_sugerido: string | null;
  categoria: 'roupa_feminina' | 'roupa_masculina' | 'calcado' | 'acessorio' | null;
  subcategoria: string | null;
  cor_principal: string | null;
  estampado: boolean;
  descricao_estampa: string | null;
  condicao: 'otimo' | 'bom' | 'regular' | null;
  confianca: number;
  ambiente_foto: 'manequim' | 'cama' | 'chao' | 'cabide' | 'corpo' | 'outro' | 'escuro' | null;
  qualidade_foto: 'alta' | 'media' | 'baixa' | null;
  multiplas_pecas: boolean;
  observacoes: string | null;
};

export type AIAnalysisRecord = AIAnalysisResponse & {
  id: string;
  peca_id: string;
  texto_contexto: string | null;
  transcricao_audio: string | null;
  modelo_usado: string;
  tokens_consumidos: number;
  criado_em: Date;
};
```

### Regras de implementacao

- Usar `response_format: { type: "json_object" }`.
- Validar com Zod antes de uso.
- Avisar usuario se `confianca < 0.6`.
- Avisar se `multiplas_pecas === true`.
- `observacoes` nao e exibido para usuaria, apenas armazenado.
- Sempre permitir revisao humana antes de salvar.

---

## Observacao

Este arquivo consolida o documento inicial para baseline de produto/engenharia do projeto Anna.
