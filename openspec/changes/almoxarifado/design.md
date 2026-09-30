## Context

O projeto é um backend NestJS (`wattapi`) com Postgres via Supabase. Módulos seguem o padrão `controller + service + dto` (ver `src/modules/heroes/`), autorização via `RoutePolicyGuard` + `@RoutePolicy({ access: {...} })`, e hierarquia de roles definida em [[role-hierarchy]]: `consultor=0`, `gerente=1`, `diretor=2`, `assessor=3`, `presidente=4`.

Esta é uma feature nova com modelo de dados relacional (materiais ↔ empréstimos) e uma regra de negócio com efeito colateral não trivial: registrar um empréstimo decrementa o estoque do material, e registrar a devolução o incrementa de volta. Isso justifica um design.md para deixar explícitas as decisões sobre concorrência, histórico e forma de restrição de acesso antes da fase de specs/tasks.

## Goals / Non-Goals

**Goals:**
- Definir o modelo de dados de `almoxarifado_materiais` e `almoxarifado_emprestimos`.
- Definir como a quantidade em estoque é mantida consistente diante de criação e devolução de empréstimos, inclusive sob concorrência.
- Definir como o histórico de transações é preservado (sem exclusão de registros).
- Definir a política de acesso (`RoutePolicy`) de cada rota.
- Definir como e quando o `daily-job` detecta empréstimos em atraso e notifica o responsável e os gerentes de projeto, de forma idempotente.

**Non-Goals:**
- Não cobre reserva antecipada de materiais (ex.: agendar um empréstimo futuro).
- Não cobre envio de e-mail para o atraso — apenas notificação in-app via tabela `notifications`, como o restante das rotinas automáticas do daily-job (ver [[notifications-automatic]]).
- Não cobre reenvio periódico (lembretes recorrentes) enquanto o item continuar em atraso — apenas uma notificação por empréstimo em atraso (ver Decisão 7).
- Não cobre upload de fotos do material (diferente de `heroes`, que usa Storage — aqui não foi solicitado).
- Não introduz um relatório/dashboard de estoque; apenas as rotas CRUD/listagem solicitadas.

## Decisions

### 1. Duas tabelas, sem tabela de auditoria separada
`almoxarifado_materiais` (catálogo de itens) e `almoxarifado_emprestimos` (uma linha por empréstimo). O histórico exigido pelo pedido é obtido mantendo cada empréstimo como um registro permanente que transita de estado `emprestado` → `devolvido` via `PATCH`, em vez de ser excluído ou movido para outra tabela. Isso evita duplicar dados em uma tabela de "histórico" separada e mantém uma única fonte de verdade consultável por `GET /almoxarifado/emprestimos`.

**Alternativa considerada**: tabela de eventos append-only (`almoxarifado_estoque_movimentacoes`) separada da tabela de empréstimos. Rejeitada por complexidade desnecessária no momento — o requisito é "manter histórico", que a própria tabela de empréstimos (sem exclusão) já satisfaz.

### 2. Ajuste de estoque via transação com lock de linha
Ao criar um empréstimo (`POST /almoxarifado/emprestimos`) ou registrar devolução (`PATCH /almoxarifado/emprestimos/:id`), o service SHALL executar leitura + validação + `UPDATE` da linha do material dentro de uma transação de banco, usando `SELECT ... FOR UPDATE` na linha do material para evitar condição de corrida quando dois empréstimos concorrentes disputam a mesma quantidade em estoque.

**Alternativa considerada**: `UPDATE almoxarifado_materiais SET quantidade_estoque = quantidade_estoque - $n WHERE id = $1 AND quantidade_estoque >= $n RETURNING quantidade_estoque` (update condicional atômico, sem lock explícito). Também é uma opção válida e mais simples; escolhida a variante com `FOR UPDATE` + transação explícita por consistência com o padrão de multi-step validation já usado em `heroes.service.ts` (que faz múltiplas queries antes do insert). O time de implementação pode optar pelo update condicional atômico como simplificação, desde que a checagem de estoque insuficiente permaneça atômica.

### 3. Quantidade em estoque nunca fica negativa
Ao criar um empréstimo, se `quantidade_solicitada > quantidade_estoque` disponível no momento, o sistema SHALL rejeitar com `400 Bad Request` antes de qualquer escrita.

### 4. Associação do empréstimo ao criador via JWT, não via body
`POST /almoxarifado/emprestimos` NÃO aceita `user_id`/`criado_por` no corpo da requisição — o responsável é sempre `req.jwtData.sub` (o usuário autenticado que faz a chamada), seguindo o padrão de `ReimbursementsController.create` (`this.reimbursementsService.create(req.jwtData.sub, body)`). Isso evita que um usuário registre um empréstimo em nome de outro.

### 5. Política de acesso
- `GET /almoxarifado/material` e `GET /almoxarifado/emprestimos`: `{ mode: 'authenticated' }` sem `rba` — qualquer rank autenticado pode listar, conforme pedido ("qualquer rank"). Interpretado como "qualquer rank autenticado", não `unauthenticated`, pois trata de dados internos de patrimônio da empresa.
- `POST /almoxarifado/material` e `PATCH /almoxarifado/material/:id`: `{ mode: 'authenticated', rba: [['role', ['gerente', 'diretor', 'assessor', 'presidente']]] }` — gerente e acima. **Nota de correção**: o design original desta seção citava uma condição `minRank` — ela NÃO existe na implementação atual de `RbaAccessCondition`/`RoutePolicyGuard` (`src/common/decorators/route-policy.decorator.ts`, `src/common/guards/route-policy.guard.ts`), que só suporta `role`, `sector` e `role AND sector` (ver `HeroesController`, que já usa `['role', ['assessor', 'presidente']]`). O spec `openspec/specs/route-policy/spec.md` descreve uma API `minRank`/`self`/`roleAndSector` ainda não implementada no código — não reutilizável por este change. Usamos `['role', [...]]` enumerando os 4 roles de rank >= 1, na mesma forma que o código existente já usa.
- `POST /almoxarifado/emprestimos` e `PATCH /almoxarifado/emprestimos/:id`: `{ mode: 'authenticated' }` sem `rba` — o pedido não restringe rank para empréstimo/devolução; qualquer colaborador autenticado pode tomar um item emprestado e devolvê-lo. Ver Open Questions.

### 6. Nomenclatura das tabelas e DTOs
Segue [[NAMING_CONVENTIONS]]: `snake_case` no banco e nos DTOs da API (consistente com `heroes.dto.ts`, que já usa `user_id`, `start_year`, etc. diretamente em `snake_case` neste backend NestJS). Tabelas: `almoxarifado_materiais`, `almoxarifado_emprestimos`.

### 7. Notificação de atraso integrada ao daily-job existente, com idempotência via coluna no próprio empréstimo
A tabela `almoxarifado_emprestimos` ganha a coluna `atraso_notificado_em TIMESTAMPTZ` (nullable). A cada execução do `daily-job` (`InternalService.checkDailyActivitiesAndSendNotifications`, chamado por `POST /internal/daily-job`), o sistema SHALL, na mesma transação/execução:

1. Selecionar empréstimos onde `devolvido_em IS NULL`, `previsao_devolucao < now()` e `atraso_notificado_em IS NULL`.
2. Para cada um, inserir uma notificação (`origin='automatic'`, `created_by=NULL`) para o `user_id` do empréstimo (`title = 'Você está com um item do almoxarifado em atraso: ' || material.nome`).
3. Inserir também uma notificação equivalente para cada usuário ativo com `role='gerente' AND sector='projetos'` (`title = 'Empréstimo em atraso: ' || material.nome || ' — responsável: ' || borrower.name`).
4. Marcar `atraso_notificado_em = now()` no empréstimo, para que a próxima execução do daily-job não notifique novamente o mesmo empréstimo.

**Por que integrar ao daily-job existente em vez de um novo endpoint/cron**: o pedido do usuário foi explícito ("integre isso no daily-job"), e o `daily-job` já resolve autenticação (`X-Internal-Secret`), idempotência diária (`internal_job_runs`) e agendamento externo — reaproveitar evita duplicar essa infraestrutura.

**Por que notificar uma única vez (não repetir a cada dia em atraso)**: evita spam de notificações diárias para o mesmo item enquanto ele permanecer emprestado e em atraso. Se lembretes recorrentes forem desejados no futuro, a coluna `atraso_notificado_em` pode virar um histórico de notificações (tabela separada) sem quebrar o contrato atual.

**Alternativa considerada**: cronjob `pg_cron` dedicado (como em [[weekly-absence-check]] e na versão antiga de [[notifications-automatic]]). Rejeitada porque o pedido pede integração explícita com o `daily-job` já existente, que roda via endpoint HTTP interno, não via `pg_cron` direto.

**Identificação de "gerente de projeto"**: interpretado como `users.role = 'gerente' AND users.sector = 'projetos'` (rank 1, setor `projetos`), únicos valores existentes no schema de usuários que correspondem a esse termo — não há um campo dedicado de "gerente do projeto X" na tabela `projects`. Ver Open Questions.

## Risks / Trade-offs

- **[Risco] Condição de corrida no decremento de estoque** → Mitigado pela transação com `SELECT ... FOR UPDATE` (Decisão 2) ou update condicional atômico.
- **[Risco] Devolução parcial de quantidade não suportada** (ex.: emprestou 5, devolve 3) → Fora do escopo pedido; o modelo assume devolução total da quantidade do empréstimo. Se necessário no futuro, um campo `quantidade_devolvida` pode ser adicionado sem breaking change.
- **[Risco] Falta de restrição de rank em `PATCH /almoxarifado/emprestimos/:id` permite que qualquer usuário registre a devolução de um empréstimo de outra pessoa** → Aceito por ora (não solicitado no pedido original); pode ser refinado para exigir que o `user_id` do empréstimo bata com o caller, ou rank >= gerente, em uma iteração futura.
- **[Risco] Nenhum gerente de projeto cadastrado (`role='gerente' AND sector='projetos'`)** → A rotina simplesmente não insere notificações para gerentes nesse caso (não é um erro); o usuário responsável ainda é notificado normalmente.
- **[Trade-off] Sem tabela de auditoria dedicada (Decisão 1)** → Simplicidade agora; se no futuro for necessário auditar múltiplas devoluções parciais do mesmo empréstimo, será preciso revisitar o modelo.
- **[Trade-off] Notificação única por empréstimo (Decisão 7)** → Simplicidade e previsibilidade agora; não há lembrete recorrente para atrasos muito longos.

## Migration Plan

1. Criar migration SQL para `almoxarifado_materiais` e `almoxarifado_emprestimos` (com FKs para `users` e `almoxarifado_materiais`, e a coluna `atraso_notificado_em`), seguindo o padrão de `20260820000001_create-heroes-table.sql`.
2. Implementar `AlmoxarifadoMateriaisModule` e `AlmoxarifadoEmprestimosModule` (ou um único `AlmoxarifadoModule` com dois controllers), reaproveitando `RoutePolicyGuard`.
3. Adicionar a checagem de empréstimos em atraso em `InternalService.checkDailyActivitiesAndSendNotifications`, e estender `dailyJobResultSchema` com a contagem de notificações de atraso criadas.
4. Sem dados legados para migrar — feature nova, sem impacto em capabilities existentes.
5. Rollback: `DROP TABLE` das duas tabelas novas e reverter `InternalService`/`dailyJobResultSchema` ao estado anterior (nenhuma outra tabela é alterada).

## Open Questions

- Deve `PATCH /almoxarifado/emprestimos/:id` (devolução) ser restrito ao autor do empréstimo e/ou a `gerente` e acima? O pedido original não especifica — assumida política aberta (Decisão 5) até confirmação.
- Devolução parcial de quantidade é necessária no futuro? Assumido que não, para este change.
- "Gerentes de projeto" foi interpretado como `role='gerente' AND sector='projetos'` — confirmar se está correto, ou se deveria ser todo `sector='projetos'` com rank >= 1 (incluindo diretor/assessor/presidente do setor), ou um responsável específico por projeto (não existe hoje no schema).
- Notificações de atraso devem se repetir periodicamente (ex.: a cada N dias em atraso) em vez de uma única vez? Assumido que não, para este change (Decisão 7).
