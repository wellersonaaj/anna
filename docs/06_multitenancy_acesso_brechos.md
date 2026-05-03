# Multitenancy e acesso segregado por brecho

Este documento desenha a evolução do MVP atual para uma experiência multitenant segura, onde cada usuária acessa apenas os dados dos brechós aos quais pertence.

## Estado atual

O modelo de domínio já nasceu com multitenancy por coluna:

- `Brecho` é a conta/tenant principal.
- `Peca`, `Cliente`, `ImportacaoLote`, `AIDraftAnalysis`, `AIDraftFeedback` e `EmailJob` já carregam `brechoId`.
- A API recebe `x-brecho-id`, coloca em `request.brechoId` e os serviços filtram por esse valor.
- O frontend guarda `brechoId` em Zustand, com valor fixo `demo-brecho`.

Isso é suficiente para demo e desenvolvimento, mas ainda não é segregação real: qualquer cliente pode enviar outro `x-brecho-id`.

## Objetivo de produto

A dona do brechó não deve pensar em "tenant" ou ID interno. A experiência precisa responder a três perguntas de forma invisível:

1. Quem é a pessoa logada?
2. A quais brechós ela tem acesso?
3. Qual brechó está ativo agora?

No MVP inicial, cada cliente terá acesso a um único brechó. O app entra direto no estoque e mostra o nome da loja no topo como confirmação. A exceção são os fundadores, que terão uma interface admin para cadastrar e gerenciar brechós.

## UX proposta

### Primeiro acesso

OTP, WebAuthn e convite automatizado ficam fora do primeiro momento. Como a operação inicial será tocada pelos fundadores, o acesso pode ser criado manualmente no painel admin.

1. Fundadores cadastram o brechó e uma pessoa responsável.
2. Fundadores cadastram a dona/equipe inicial desse brechó.
3. O sistema gera uma senha provisória ou permite definir uma senha inicial.
4. A senha é enviada manualmente por WhatsApp pelos fundadores.
5. A usuária entra com telefone + senha.
6. Como ela pertence a um único brechó, o app abre direto no estoque.

Backlog:

- OTP por WhatsApp.
- WebAuthn/biometria.
- convite automatizado por link.
- recuperação de senha self-service.

### Shell do app

O topo atual exibe "Agente Brechó". Ele deve evoluir para uma identidade de contexto:

- Avatar/ícone da loja.
- Nome do brechó ativo.
- Badge discreto de plano/trial quando útil.
- Menu de conta apenas com "Sair" no MVP.

Para operação mobile, o nome do brechó no topo é feedback constante. Gestão de equipe, plano, avatar e dados cadastrais fica no painel admin dos fundadores neste primeiro momento.

### Seleção de brechó

Não haverá seleção de brechó para clientes no MVP inicial.

Premissa:

- dona/equipe de brechó pertence a um único brechó;
- fundadores gerenciam vários brechós pelo painel admin;
- se os fundadores precisarem abrir a operação de um brechó específico, isso pode ser uma ação interna do admin ("Abrir operação deste brechó"), não uma tela pública de seleção.

Backlog:

- seleção de brechó para usuários com múltiplos acessos;
- troca de brechó dentro do app operacional;
- último brechó usado por usuário.

### Equipe e permissões

Para simplificar, todos os usuários de um brechó podem nascer como `DONO` no MVP.

Backlog de papéis:

- `DONO`: gerencia equipe, plano, dados do brechó e tudo da operação.
- `OPERADOR`: cadastra peças, vende, reserva, atualiza entregas e clientes.

No primeiro momento, cadastro de equipe, plano e dados do brechó será feito pelos fundadores no painel admin. A dona do brechó não precisa ter tela de equipe ou plano dentro do app operacional.

## Banco de dados

### Decisão: banco compartilhado por enquanto

Para o estágio atual do Anna, a recomendação é manter **um banco transacional compartilhado**, com `brechoId` obrigatório em toda tabela de negócio. Esse é o modelo "shared database, tenant column".

Motivos:

- simplifica migrations, deploy, backup e suporte;
- permite análises cross-brecho no futuro sem juntar dezenas de bancos;
- combina com o tamanho esperado dos tenants no MVP;
- reduz custo operacional;
- conversa bem com Prisma e com o schema atual, que já foi modelado assim.

Banco por brechó só deve entrar se houver uma razão forte:

- cliente enterprise exigindo isolamento físico;
- volume muito grande de uma única conta;
- requisito regulatório/contratual específico;
- necessidade de restore individual com SLA forte.

Mesmo nesse cenário, o ideal seria tratar como exceção futura. A arquitetura principal continua sendo compartilhada, e tenants especiais poderiam ir para clusters/bancos dedicados por configuração.

### Regra prática para tabelas

Toda tabela que representa dado operacional de um brechó deve carregar `brechoId` diretamente ou estar ligada a uma entidade que carrega `brechoId` com validação clara na query.

Exemplos que devem ter `brechoId` direto:

- `Peca`
- `Cliente`
- `ImportacaoLote`
- `AIDraftAnalysis`
- `AIDraftFeedback`
- `EmailJob`
- futuras tabelas de metas, configurações, equipe operacional, convites e billing por brechó

Exemplos que podem não ter `brechoId` direto, desde que sejam sempre acessados pelo pai:

- `PecaFoto`, via `Peca`
- `Venda`, via `Peca` e `Cliente`
- `Entrega`, via `Venda`
- `ImportacaoFoto`, via `ImportacaoLote`
- `ImportacaoGrupo`, via `ImportacaoLote`

Para rotas críticas e relatórios, vale duplicar `brechoId` em algumas tabelas filhas se isso simplificar queries, índices e auditoria. A prioridade é evitar qualquer query ambígua.

### Índices e constraints

Todos os índices operacionais devem começar por `brechoId` quando a consulta é feita dentro do brechó:

- `Peca(brechoId, status, criadoEm)`
- `Cliente(brechoId, nome)`
- `ImportacaoLote(brechoId, status, criadoEm)`
- futuras vendas/relatórios: considerar índices por `brechoId` + período

Uniques de negócio também precisam considerar o tenant. Por exemplo, se um dia houver SKU/código interno da peça, o unique deve ser `@@unique([brechoId, codigo])`, não `codigo` global.

Adicionar identidade e vínculo de acesso:

```prisma
enum UserRole {
  DONO
  OPERADOR
}

model User {
  id              String   @id @default(cuid())
  telefone        String   @unique
  nome            String?
  email           String?
  passwordHash    String?
  isFounder       Boolean  @default(false)
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt

  memberships     BrechoMembership[]
  sessions        AuthSession[]
}

model BrechoMembership {
  id        String   @id @default(cuid())
  userId    String
  brechoId  String
  role      UserRole
  ativo     Boolean  @default(true)
  criadoEm  DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  brecho Brecho @relation(fields: [brechoId], references: [id], onDelete: Cascade)

  @@unique([userId, brechoId])
  @@index([brechoId, role])
}

model AuthSession {
  id             String   @id @default(cuid())
  userId         String
  refreshTokenHash String @unique
  ultimoBrechoId String?
  expiraEm       DateTime
  criadoEm       DateTime @default(now())
  revogadoEm     DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Também adicionar em `Brecho`:

- `slug` opcional para URLs/admin e identificação humana.
- `status` (`ATIVO`, `TRIAL`, `SUSPENSO`) se o plano precisar bloquear uso.

`OPERADOR`, OTP e WebAuthn continuam previstos, mas não entram na primeira implementação. O primeiro corte precisa apenas de usuário com senha, flag de fundador e membership `DONO`.

## API e segurança

### Contrato de sessão

Substituir o header solto por autenticação:

- `Authorization: Bearer <accessToken>` em todas as rotas privadas.
- Token contém `sub` e, de preferência, `brechoId` ativo.
- O backend valida se `sub` tem membership ativa no `brechoId`.
- `request.brechoId` passa a vir do token/sessão validada.

Durante migração, o `x-brecho-id` pode continuar apenas em desenvolvimento ou ser aceito quando bater com um membership válido. Em produção, não deve definir acesso sozinho.

### Endpoints novos

- `POST /auth/login`
- `GET /me`
- `POST /auth/logout`

Endpoints admin dos fundadores:

- `GET /admin/brechos`
- `POST /admin/brechos`
- `GET /admin/brechos/:brechoId`
- `PATCH /admin/brechos/:brechoId`
- `POST /admin/brechos/:brechoId/users`
- `PATCH /admin/users/:userId`
- `POST /admin/users/:userId/reset-password`

Backlog:

- `POST /auth/otp/start`
- `POST /auth/otp/verify`
- WebAuthn/biometria.
- `GET /me/brechos`
- `POST /me/brechos/:brechoId/select`

`GET /me` deve retornar usuário e brechó ativo. Para cliente comum, haverá apenas um:

```json
{
  "user": { "id": "user_1", "nome": "Catia", "telefone": "+55..." },
  "activeBrecho": { "id": "brecho_1", "nome": "Brechó da Catia", "plano": "TRIAL" },
  "memberships": [
    { "brecho": { "id": "brecho_1", "nome": "Brechó da Catia" }, "role": "DONO" }
  ]
}
```

### Middleware

Evoluir `brechoContextPlugin` para `authContextPlugin`:

1. Liberar somente rotas públicas (`/health`, `/auth/*`).
2. Ler e validar JWT.
3. Carregar membership ativa. Se `user.isFounder` estiver em rota admin, permitir acesso administrativo.
4. Preencher `request.user`, `request.brechoId` e `request.role`.
5. Bloquear `401` quando não autenticado e `403` quando sem acesso ao brechó.

### Defesa em profundidade

Manter filtros por `brechoId` nos serviços. Depois que o fluxo estiver estável, avaliar Row Level Security no Postgres:

- Começar sem RLS para reduzir complexidade da primeira entrega.
- Adicionar auditoria de queries e testes de isolamento.
- Introduzir RLS em uma rodada específica de hardening, como já previsto em `02_modelagem_banco.md`.

## Storage e S3

O S3/R2 também deve seguir isolamento lógico por brechó, mas não precisa de um bucket por brechó no MVP.

Recomendação:

- um bucket por ambiente (`anna-dev`, `anna-prod`);
- prefixo obrigatório por tenant;
- URLs assinadas sempre geradas pela API após validar membership;
- nunca aceitar path arbitrário vindo do frontend.

Formato de chave:

```txt
brechos/{brechoId}/items/{pecaId}/lotes/{loteId}/{fotoId}.jpg
brechos/{brechoId}/importacoes/{loteId}/{fotoId}.jpg
brechos/{brechoId}/audios/{loteId}/{audioId}.webm
```

O código atual já usa `brechoId` no path. A evolução é padronizar o prefixo `brechos/` e garantir que toda geração de presign parta do `request.brechoId` autenticado.

Bucket por brechó só vale se algum cliente exigir isolamento físico, billing separado por bucket ou política de retenção totalmente diferente. Para o produto padrão, prefixo por `brechoId` é suficiente.

Pontos de segurança:

- `publicUrl` deve apontar apenas para objetos daquele brechó.
- Se fotos virarem privadas, servir via URL assinada de leitura curta.
- Jobs de IA devem ler objetos por chave validada, não por URL arbitrária enviada pelo usuário.
- Lifecycle pode limpar rascunhos/importações abandonadas por prefixo e status no banco.

## Frontend

### Estado de sessão

Trocar `session.store` de `brechoId: "demo-brecho"` para:

- `accessToken`
- `user`
- `activeBrecho`
- `memberships`
- `isAuthenticated`

O `brechoId` usado pelas queries deve vir de `activeBrecho.id`, nunca de input manual. No MVP, cliente comum sempre terá um único `activeBrecho`.

### Rotas

Adicionar guardas:

- Rotas públicas: login.
- Rotas privadas: app operacional.
- Rotas admin: painel dos fundadores.

Rotas sugeridas:

- `/login`
- `/admin`
- `/admin/brechos`
- `/admin/brechos/new`
- `/admin/brechos/:brechoId`

### Queries e cache

Continuar incluindo `brechoId` nas query keys. Isso mantém o app pronto para múltiplos brechós no futuro, mesmo que o MVP tenha só um brechó por cliente.

Se uma ação interna de fundador trocar o brechó operacional aberto:

- cancelar queries em andamento;
- limpar/invalidate cache operacional;
- navegar para `/`;
- mostrar toast curto: "Você está no Brechó X".

## Operação e onboarding interno

O painel fundador entra no primeiro corte porque a operação inicial será tocada por vocês, e a sócia precisa conseguir operar sem mexer no código ou banco.

### Painel fundador

Funcionalidades imediatas:

- listar brechós;
- criar brechó;
- editar nome, telefone, email, plano, status, avatar/logo e trial;
- criar dona/equipe inicial do brechó;
- redefinir senha provisória;
- ativar/desativar acesso de uma pessoa;
- ver resumo operacional básico do brechó.

Funcionalidades que podem ficar para depois:

- convites automáticos;
- permissões granulares;
- cobrança/billing self-service;
- troca de plano pela dona do brechó;
- edição de equipe pela dona do brechó.

Fluxo operacional:

1. Criar `Brecho`.
2. Criar ou reutilizar `User` por telefone.
3. Criar `BrechoMembership` como `DONO`.
4. Definir ou gerar senha provisória.
5. Enviar credenciais manualmente por WhatsApp.

O painel pode ser simples e interno, mas deve existir desde cedo para dar autonomia operacional.

## Dados e analytics

Existem dois tipos de análise que o Anna vai precisar:

1. **Analytics dentro do brechó:** perguntas que a dona do brechó vê no produto.
2. **Analytics cross-brecho:** inteligência agregada do Anna, benchmarking, recomendações e oportunidades entre brechós.

### Dentro do brechó

No começo, pode sair do próprio Postgres transacional:

- peças que mais vendem por categoria, tamanho, marca, cor e faixa de preço;
- peças paradas por mais de N dias;
- taxa de reserva para venda;
- faturamento por período;
- clientes que mais compram naquele brechó;
- tempo médio até venda e até entrega.

Essas consultas sempre filtram por `brechoId` e podem virar endpoints de relatório. Quando ficarem pesadas, criar tabelas de agregados por brechó e período:

```txt
analytics_brecho_dia
analytics_categoria_dia
analytics_cliente_brecho_mes
```

Essas tabelas podem ser atualizadas por job diário ou incremental.

### Cross-brecho

Análises cross-brecho não devem vazar dado sensível de uma loja para outra. Elas servem para inteligência do produto e recomendações controladas:

- quais categorias vendem mais por região/perfil de brechó;
- faixas de preço com maior giro;
- tamanhos/categorias com maior demanda;
- padrões de peça parada;
- sugestão de que uma peça parada em um brechó poderia ter demanda em outro.

Para isso, o banco compartilhado ajuda muito porque todos os dados estão no mesmo modelo. Mas a camada de produto precisa diferenciar:

- **dado operacional privado:** nome de cliente, contato, estoque completo, venda individual;
- **dado agregado:** métricas por categoria, preço, tamanho, região e período;
- **dado compartilhável por opt-in:** oportunidade de repasse/troca entre brechós.

Exemplo: "Vestidos midi M vendem 32% mais rápido em brechós similares" é agregado. "Cliente Maria comprou no Brechó X" é dado privado e não deve aparecer para outro brechó.

### Cliente entre brechós

Tecnicamente, hoje `Cliente` é por brechó. Isso é correto para privacidade e operação: cada brechó tem sua própria relação comercial.

No futuro, se fizer sentido entender uma pessoa compradora cross-brecho, criar uma camada separada de identidade resolvida:

```txt
GlobalCustomerIdentity
CustomerIdentityLink
```

Essa camada ligaria clientes parecidos por telefone/Instagram normalizado, consentimento e regras de privacidade. Ela não deve substituir `Cliente`; deve ficar acima, para analytics e recursos opt-in.

### Estrutura de dados recomendada

Fase atual:

- Postgres transacional como fonte da verdade.
- Relatórios simples direto no Postgres.
- `brechoId` em todos os dados operacionais.

Fase seguinte:

- jobs de agregação para tabelas analytics dentro do próprio Postgres;
- snapshots diários por brechó/categoria/status/venda;
- eventos de domínio para alimentar métricas sem recalcular tudo.
- primeiro processamento em job diário, suficiente para o começo.

Fase mais madura:

- warehouse/lake separado para analytics cross-brecho;
- ETL/ELT a partir do Postgres e eventos;
- dados anonimizados/pseudonimizados para análises sensíveis;
- camada semântica para métricas oficiais.

Ferramentas possíveis no futuro: BigQuery, Snowflake, ClickHouse, DuckDB/Parquet em S3, ou Postgres read replica com schema analítico. A decisão deve vir depois que houver volume e perguntas reais.

### Oportunidades entre brechós

Para sugerir que uma peça parada em um brechó pode interessar a outro, tratar como produto próprio:

1. Calcular sinais agregados de demanda por categoria/tamanho/preço.
2. Identificar peça parada com boa chance fora do brechó atual.
3. Mostrar primeiro para a dona: "Essa peça pode ter demanda em brechós similares".
4. Só compartilhar item com outro brechó se houver opt-in explícito.

Isso evita transformar analytics em vazamento de estoque ou de cliente.

## Plano incremental

### Fase 1 - Fundacao de acesso

- Criar tabelas `User`, `BrechoMembership` e sessões.
- Criar login simples com telefone + senha.
- Criar flag `isFounder` para acesso ao painel admin.
- Criar `GET /me`.
- Garantir que novas queries e uniques de negócio considerem `brechoId`.

### Fase 2 - Painel fundador

- Criar `/admin` protegido por `isFounder`.
- Criar CRUD básico de brechó.
- Criar vínculo dona/equipe inicial com role `DONO`.
- Criar reset/definição de senha provisória.
- Permitir avatar/logo e campos comerciais do brechó.

### Fase 3 - App privado

- Criar tela de login.
- Atualizar Zustand e API client para usar `Authorization`.
- Evoluir middleware para validar membership.
- Remover dependência de `demo-brecho` no frontend.

### Fase 4 - UX do brechó

- Mostrar nome do brechó ativo no `AppShell`.
- Adicionar menu de conta com apenas "Sair".
- Manter equipe, plano e avatar editáveis apenas pelo painel fundador.

### Fase 5 - Hardening

- Testes de isolamento entre brechós.
- Auditoria de rotas e jobs assíncronos.
- CORS restrito em produção.
- Rate limit em login.
- RLS opcional no Postgres.
- Revisão de paths S3 e leitura privada de objetos.

### Fase 6 - Analytics

- Criar endpoints de relatórios por brechó no Postgres.
- Criar job diário para tabelas agregadas.
- Definir política de dados agregados vs dados privados.
- Planejar warehouse/lake apenas quando houver volume e perguntas cross-brecho recorrentes.

### Backlog de acesso avançado

- OTP por WhatsApp.
- WebAuthn/biometria.
- convite automático por link.
- seleção de brechó para usuários com múltiplos acessos.
- papéis `OPERADOR` e permissões granulares.
- telas de equipe/plano para a dona do brechó.

## Critérios de aceite

- Usuária sem sessão não acessa estoque, vendas, clientes, relatórios ou importações.
- Usuária com membership em apenas um brechó entra direto nele.
- Cliente comum não vê seleção de brechó no MVP.
- Fundador consegue criar brechó, criar dona/equipe inicial e redefinir senha no painel admin.
- Alterar `x-brecho-id` manualmente não concede acesso a outro brechó.
- Todas as listas e detalhes continuam filtrados por `brechoId`.
- Jobs, uploads e análises de IA continuam gravando paths/dados no brechó ativo.
- Logs continuam contendo `reqId`, `userId`, `brechoId`, rota e status.
- Nenhum relatório de uma loja lê dados de outra sem passar por camada cross-brecho agregada/autorizada.
- Nenhum objeto de storage é gerado fora do prefixo do brechó autenticado.
