## 1. Migrations

- [x] 1.1 Criar migration `alter-member-violations-source-applied-by.sql`: `ALTER COLUMN applied_by DROP NOT NULL`, `ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'`, `ADD CONSTRAINT chk_applied_by_source CHECK (applied_by IS NOT NULL OR source = 'automatic')`
- [x] 1.2 Criar migration `create-internal-job-runs-table.sql`: tabela `internal_job_runs(id UUID PK, job_name TEXT NOT NULL, week_start DATE NOT NULL, ran_at TIMESTAMPTZ DEFAULT now())` com UNIQUE `(job_name, week_start)`
- [x] 1.3 Criar migration `schedule-weekly-absence-check.sql`: registrar pg_cron schedule `0 3 * * 1` chamando a Edge Function via `net.http_post` ou equivalente

## 2. Ajustes em violations (TDD primeiro)

- [x] 2.1 Escrever testes que falham: `POST /violations` com `applied_by` nulo e `source = 'automatic'` é aceito no banco; constraint CHECK rejeita `applied_by = null` com `source = 'manual'`
- [x] 2.2 Atualizar `ViolationRow` em `violation.dto.ts`: `applied_by: string | null` e adicionar campo `source: 'manual' | 'automatic'`
- [x] 2.3 Atualizar `ViolationsService.create()`: inserir `applied_by = caller.id` e `source = 'manual'` explicitamente
- [x] 2.4 Garantir que `toResponse` e `ViolationResponseWithAppliedBy` tratam `applied_by: string | null` sem quebrar
- [x] 2.5 Confirmar que testes de violations existentes passam após ajustes

## 3. InternalModule (TDD primeiro)

- [x] 3.1 Escrever testes que falham para `POST /internal/weekly-absence-check`: 401 sem header, 401 com secret errado, 200 com secret correto, 200 sem processar na segunda chamada da mesma semana
- [x] 3.2 Criar `src/modules/internal/internal.module.ts`, `internal.controller.ts`, `internal.service.ts`
- [x] 3.3 Implementar guard `InternalSecretGuard`: compara `X-Internal-Secret` header com `INTERNAL_JOB_SECRET` env var em timing-safe; retorna 401 se inválido
- [x] 3.4 Implementar `POST /internal/weekly-absence-check` no controller (sem body, autenticado pelo guard)
- [x] 3.5 Implementar `InternalService.weeklyAbsenceCheck()`:
  - Calcular `week_start = date_trunc('week', now() - interval '1 week')` UTC
  - Checar `internal_job_runs` — se já existe registro para `('weekly-absence-check', week_start)`, retornar early com `{ already_ran: true }`
  - Buscar `min_week_hours` via `SettingsService`
  - Buscar IDs de AN07 e AN13 via `SELECT id FROM company_norms WHERE code IN ('AN07','AN13')`
  - Buscar total de minutos por usuário ativo na semana anterior (query similar a `getWeeklySummaryList` com `weekOffset = 1`)
  - Para cada usuário abaixo do mínimo: determinar norma, inserir em `member_violations` com `source = 'automatic'`, `applied_by = NULL`, `reason` descrevendo a semana
  - Enviar email via `EmailService` para cada violation inserida
  - Inserir registro em `internal_job_runs`
  - Retornar `{ week_start, users_checked, violations_applied }`
- [x] 3.6 Registrar `InternalModule` em `AppModule`
- [x] 3.7 Adicionar `INTERNAL_JOB_SECRET` ao `EnvService` e validação de env

## 4. Supabase Edge Function

- [x] 4.1 Criar `supabase/functions/weekly-absence-trigger/index.ts`: função Deno que lê `INTERNAL_JOB_SECRET` do env, chama `POST <API_URL>/internal/weekly-absence-check` com o header correto, loga a resposta e retorna erro se status >= 400
- [x] 4.2 Criar `supabase/functions/weekly-absence-trigger/deno.json` (se necessário para imports)
- [x] 4.3 Documentar as env vars necessárias no Supabase: `INTERNAL_JOB_SECRET`, `API_URL`

## 5. Testes de integração

- [x] 5.1 Escrever suite `src/test/internal/POST.spec.ts` seguindo o padrão de `integration-test` skill: cenários de 401 (sem header, header errado), 200 primeira execução (verifica violations inseridas, email enviado), 200 segunda execução mesma semana (idempotência), usuário inativo ignorado

## 6. Documentação e API Docs

- [x] 6.1 Atualizar API docs para refletir o campo `source` na resposta de violations e `applied_by` como nullable
- [x] 6.2 Documentar endpoint `POST /internal/weekly-absence-check` (propósito, auth, resposta)

## 7. Finalização

- [x] 7.1 Rodar `npm test` e garantir que todos os testes passam (incluindo os de violations existentes)
- [x] 7.2 Verificar ausência de erros de ESLint nos arquivos modificados
- [x] 7.3 Confirmar variáveis de ambiente documentadas em `.env.example`
