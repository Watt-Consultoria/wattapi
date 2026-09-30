## Why

A empresa não possui hoje nenhum controle sistematizado de materiais físicos (equipamentos, ferramentas, itens de patrimônio) e de quem está com a posse de cada item. Empréstimos e devoluções acontecem de forma informal, sem histórico auditável nem rastreio da quantidade disponível em estoque, gerando risco de perda de itens e falta de visibilidade sobre o que está emprestado, para quem e desde quando.

## What Changes

- Adiciona a rota `/almoxarifado/material` para gerenciar o cadastro de materiais do almoxarifado:
  - `GET /almoxarifado/material`: lista todos os materiais em estoque. Acesso liberado para qualquer rank autenticado.
  - `POST /almoxarifado/material`: cadastra um novo material (nome, descrição, quantidade em estoque, observações). Restrito a `gerente` e acima (rank >= 1).
  - `PATCH /almoxarifado/material/:id`: atualiza um material existente. Restrito a `gerente` e acima (rank >= 1).
- Adiciona a rota `/almoxarifado/emprestimos` para gerenciar o ciclo de vida de empréstimos de materiais:
  - `GET /almoxarifado/emprestimos`: lista os empréstimos (ativos e históricos). Acesso liberado para qualquer rank autenticado.
  - `POST /almoxarifado/emprestimos`: registra um novo empréstimo, associando o material, a quantidade emprestada, a pessoa responsável (o próprio usuário autenticado que cria o registro), data/hora do empréstimo, data de devolução prevista e observações. Ao registrar, a quantidade em estoque do material correspondente SHALL ser decrementada.
  - `PATCH /almoxarifado/emprestimos/:id`: registra a devolução de um empréstimo (data/hora de devolução efetiva, observações de devolução). Ao registrar a devolução, a quantidade em estoque do material correspondente SHALL ser incrementada de volta.
- Mantém no banco um histórico append-only das transações de empréstimo/devolução, permitindo auditoria de todas as movimentações de estoque, mesmo após a devolução ser registrada.
- Segue o padrão RBAC existente do projeto (`RoutePolicyGuard` + `@RoutePolicy`), reutilizando a condição `role` já usada em outros controllers (ex.: `HeroesController`) para expressar "gerente e acima".
- Adiciona uma rotina automática de notificação de empréstimos em atraso, integrada ao `daily-job` existente (`POST /internal/daily-job`):
  - Ao rodar, o daily-job SHALL identificar empréstimos de almoxarifado com `devolvido_em IS NULL` e `previsao_devolucao` no passado que ainda não foram notificados.
  - Para cada empréstimo em atraso, o sistema SHALL criar uma notificação (`origin='automatic'`) para o usuário responsável pelo empréstimo, e uma notificação para cada usuário com `role='gerente'` e `sector='projetos'` (gerentes de projeto).
  - Cada empréstimo em atraso SHALL ser notificado apenas uma vez (idempotência via marcação no próprio registro do empréstimo), evitando notificações repetidas em execuções subsequentes do daily-job enquanto o item continuar em atraso.

## Capabilities

### New Capabilities
- `almoxarifado-materials`: cadastro e consulta de materiais do almoxarifado (item, quantidade em estoque, observações sobre estado).
- `almoxarifado-loans`: ciclo de vida de empréstimo e devolução de materiais, associado ao usuário responsável, com histórico de transações e ajuste automático de estoque.
- `almoxarifado-overdue-notifications`: rotina automática (parte do daily-job) que detecta empréstimos vencidos e notifica o usuário responsável e os gerentes de projeto.

### Modified Capabilities
- `daily-job`: o daily-job passa a executar, além da rotina de notificação de atividades, a rotina de notificação de empréstimos de almoxarifado em atraso, na mesma execução e sob a mesma idempotência diária (`internal_job_runs`). O resumo retornado por `POST /internal/daily-job` passa a incluir a contagem de notificações de atraso criadas.

## Impact

- **Novos módulos de código**: `src/modules/almoxarifado/` (ou `src/modules/almoxarifado/materials` + `src/modules/almoxarifado/emprestimos`), seguindo o padrão de `src/modules/heroes/` (controller + service + DTOs).
- **Banco de dados**: novas tabelas `almoxarifado_materiais` (itens de estoque) e `almoxarifado_emprestimos` (registros de empréstimo/devolução, com histórico preservado via soft state em vez de exclusão, e uma coluna de controle de notificação de atraso).
- **Autorização**: usa o `RoutePolicyGuard` existente; nenhuma mudança nas specs `route-policy` ou `role-hierarchy`, apenas reutilização da condição `role` (ver Nota de correção em [[design]]).
- **Código existente modificado**: `src/modules/internal/internal.service.ts` (`checkDailyActivitiesAndSendNotifications`) passa a também executar a checagem de empréstimos em atraso; `src/modules/internal/dto/internal.response.dto.ts` (`dailyJobResultSchema`) ganha um novo campo.
- **Sem impacto em capabilities existentes de negócio** (`heroes`, `wallet-*`, `notifications-crud`, etc.) além da integração pontual com `daily-job` descrita acima — área nova e isolada.
