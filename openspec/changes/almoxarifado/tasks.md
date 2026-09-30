## 1. Database

- [x] 1.1 Criar migration (`npm run services:migration:create -- create-almoxarifado-tables`) com as tabelas `almoxarifado_materiais` (`id`, `nome`, `descricao`, `quantidade_estoque` CHECK >= 0, `observacoes`, `created_at`, `updated_at`) e `almoxarifado_emprestimos` (`id`, `material_id` FK, `quantidade` CHECK > 0, `user_id` FK para `users`, `emprestado_em`, `previsao_devolucao`, `devolvido_em` nullable, `observacoes`, `atraso_notificado_em` nullable, `created_at`, `updated_at`), seguindo o padrão de `20260820000001_create-heroes-table.sql`.
- [x] 1.2 Adicionar índices: `idx_almoxarifado_emprestimos_material_id`, `idx_almoxarifado_emprestimos_user_id`, `idx_almoxarifado_emprestimos_devolvido_em` (para consultas de empréstimos ativos) e `idx_almoxarifado_emprestimos_atraso` (parcial, `WHERE devolvido_em IS NULL AND atraso_notificado_em IS NULL`, para a rotina do daily-job).
- [ ] 1.3 Rodar `npm run services:db:reset` e confirmar que a migration aplica sem erros.

## 2. Test orchestrator seed helpers

- [x] 2.1 Adicionar `orchestrator.database.seed.createAlmoxarifadoMaterial({ nome?, descricao?, quantidade_estoque?, observacoes? })` em `src/test/orchestrator.ts`.
- [x] 2.2 Adicionar `orchestrator.database.seed.createAlmoxarifadoEmprestimo({ material_id, user_id, quantidade?, previsao_devolucao?, observacoes? })` em `src/test/orchestrator.ts`.

## 3. Capability `almoxarifado-materials` — TDD

- [x] 3.1 Escrever `src/test/almoxarifado-material/GET.spec.ts` cobrindo os cenários de [[almoxarifado-materials]] (listagem para qualquer rank autenticado, 401 sem token) seguindo o padrão de `integration-test` skill. Confirmar que falha (rota ainda não existe).
- [x] 3.2 Escrever `src/test/almoxarifado-material/POST.spec.ts` cobrindo criação (201 para `gerente`+, 400 campos obrigatórios/quantidade negativa, 403 para `consultor`, 401 sem token). Confirmar que falha.
- [x] 3.3 Escrever `src/test/almoxarifado-material/PATCH.spec.ts` cobrindo atualização (200, 400 corpo vazio/quantidade negativa, 404, 403 para `consultor`). Confirmar que falha.
- [x] 3.4 Criar `src/modules/almoxarifado/dto/almoxarifado-material.dto.ts` (`CreateAlmoxarifadoMaterialDto`, `UpdateAlmoxarifadoMaterialDto`) e `dto/almoxarifado-material.response.dto.ts`, em `snake_case`, seguindo `hero.dto.ts`/`hero.response.dto.ts`.
- [x] 3.5 Criar `src/modules/almoxarifado/almoxarifado-material.service.ts` com `create`, `findAll`, `update`, validando `quantidade_estoque >= 0` e existência do material.
- [x] 3.6 Criar `src/modules/almoxarifado/almoxarifado-material.controller.ts` com `GET /almoxarifado/material` (`RoutePolicy: { mode: 'authenticated' }`), `POST` e `PATCH /:id` (`RoutePolicy: { mode: 'authenticated', rba: [['role', ['gerente', 'diretor', 'assessor', 'presidente']]] }`, seguindo o padrão de `HeroesController`).
- [ ] 3.7 Rodar os três specs de `almoxarifado-material` e confirmar GREEN.

## 4. Capability `almoxarifado-loans` — TDD

- [x] 4.1 Escrever `src/test/almoxarifado-emprestimos/GET.spec.ts` cobrindo listagem (qualquer rank autenticado, inclui empréstimos devolvidos, 401 sem token). Confirmar que falha.
- [x] 4.2 Escrever `src/test/almoxarifado-emprestimos/POST.spec.ts` cobrindo criação (201 e decremento de `quantidade_estoque`, 400 estoque insuficiente/quantidade inválida/campos ausentes, 404 material inexistente, 401 sem token, associação automática ao `user_id` do caller). Confirmar que falha.
- [x] 4.3 Escrever `src/test/almoxarifado-emprestimos/PATCH.spec.ts` cobrindo devolução (200 e incremento de `quantidade_estoque`, 400 empréstimo já devolvido, 404, 401 sem token, registro permanece visível em `GET` após devolução). Confirmar que falha.
- [x] 4.4 Criar `src/modules/almoxarifado/dto/almoxarifado-emprestimo.dto.ts` (`CreateAlmoxarifadoEmprestimoDto`, `UpdateAlmoxarifadoEmprestimoDto` para devolução) e `dto/almoxarifado-emprestimo.response.dto.ts`.
- [x] 4.5 Criar `src/modules/almoxarifado/almoxarifado-emprestimo.service.ts`: `create(userId, dto)` valida material existente e estoque suficiente, decrementa `quantidade_estoque` e insere o empréstimo em uma transação com `SELECT ... FOR UPDATE` na linha do material (ver [[design]] Decisão 2); `findAll()`; `returnLoan(id, dto)` valida `devolvido_em` ainda nulo, incrementa `quantidade_estoque` de volta e grava `devolvido_em`/`observacoes`, também em transação.
- [x] 4.6 Criar `src/modules/almoxarifado/almoxarifado-emprestimo.controller.ts` com `GET`, `POST` e `PATCH /:id` sob `RoutePolicy: { mode: 'authenticated' }` (sem `rba`), usando `@Req() req: AuthRequest` para extrair `req.jwtData.sub` como responsável, seguindo o padrão de `ReimbursementsController`.
- [ ] 4.7 Rodar os três specs de `almoxarifado-emprestimos` e confirmar GREEN.

## 5. Module wiring

- [x] 5.1 Criar `src/modules/almoxarifado/almoxarifado.module.ts` registrando os dois controllers e os dois services, e importá-lo em `AppModule`.

## 6. Capability `almoxarifado-overdue-notifications` — TDD

- [x] 6.1 Adicionar `orchestrator.database.seed.createUser({ ..., role: 'gerente', sector: 'projetos' })` reaproveitando o helper existente (nenhuma mudança necessária se `role`/`sector` já são parametrizáveis — apenas confirmar). Confirmado: `createUser` já aceita `role`/`sector` livremente.
- [x] 6.2 Criar `src/test/internal/daily-job.spec.ts` (adaptando o padrão da skill `integration-test` para autenticação via `X-Internal-Secret` em vez de JWT/role) cobrindo os cenários de [[almoxarifado-overdue-notifications]] e do requirement modificado de [[daily-job]]:
  - 200 com `notifications_created` e a nova contagem de notificações de atraso quando existem empréstimos vencidos (`devolvido_em IS NULL`, `previsao_devolucao` no passado).
  - Notificação criada para o `user_id` do empréstimo em atraso.
  - Notificação criada para cada usuário `role='gerente' AND sector='projetos'` ativo.
  - Nenhuma notificação de atraso duplicada numa segunda chamada (mesmo dia retorna 409 antes de reprocessar; simular novo dia ou testar a query de detecção isoladamente via `atraso_notificado_em` já preenchido).
  - Empréstimos ainda dentro do prazo (`previsao_devolucao` no futuro) ou já devolvidos NÃO geram notificação de atraso.
  - 401 sem `X-Internal-Secret` ou com valor inválido.
  - 409 na segunda chamada do mesmo dia.
  Confirmar que os novos cenários falham antes da implementação (rota/lógica ainda não existe).
- [x] 6.3 Estender `dailyJobResultSchema`/`DailyJobResult` em `src/modules/internal/dto/internal.response.dto.ts` com o novo campo de contagem de notificações de atraso (ex.: `almoxarifado_overdue_notifications_created: z.number()`).
- [x] 6.4 Implementar em `InternalService.checkDailyActivitiesAndSendNotifications` (ou um método privado chamado por ele) a rotina descrita em [[design]] Decisão 7: selecionar empréstimos em atraso não notificados, inserir notificação para o responsável, inserir notificação para cada gerente de projeto ativo, marcar `atraso_notificado_em = now()`, e somar a contagem ao resultado retornado.
- [ ] 6.5 Rodar `src/test/internal/daily-job.spec.ts` e confirmar GREEN, incluindo os cenários pré-existentes de notificação de atividades (não podem regredir).

## 7. Documentation

- [x] 7.1 Rodar `npm run docs:generate` para atualizar `openapi.json` com as novas rotas `/almoxarifado/material` e `/almoxarifado/emprestimos`, e com o novo campo de resposta de `POST /internal/daily-job`. Confirmar `npm run docs:check` sem diferenças pendentes.

## 8. Finish

- [x] 8.1 Rodar `npm run lint` nos arquivos modificados/criados e corrigir quaisquer violações. **Nota**: `npm run lint` roda `prettier --check` sobre TODO `src/`, e o checkout local tem `core.autocrlf=true` fazendo ~176 arquivos pré-existentes (não tocados por este change) reportarem diffs de CRLF/LF — falha de ambiente alheia a este change. Rodei `oxlint --deny-warnings` e `prettier --check`/`--write` escopados aos arquivos criados/modificados nesta mudança: todos passam limpos. Também rodei `npm run build` (nest build) e `tsc --noEmit` no projeto inteiro — ambos sem erros.
- [ ] 8.2 Rodar `npm test` e confirmar que toda a suíte passa, incluindo os specs novos de `almoxarifado-material`, `almoxarifado-emprestimos` e `internal/daily-job`.
