## 1. Testes (TDD — escrever antes da implementação)

- [x] 1.1 Criar teste de integração para `POST /internal/weekly-job` — deve falhar (404) antes da implementação
- [x] 1.2 Criar teste de integração para `POST /internal/daily-job` — deve falhar (404) antes da implementação

## 2. NestJS — InternalService

- [x] 2.1 Renomear método `weeklyAbsenceCheck()` para `checkWeeklyAbsence()` no `InternalService`
- [x] 2.2 Adicionar método `checkDailyActivitiesAndSendNotifications()` no `InternalService` com a lógica atualmente no pg_cron (`INSERT INTO notifications ... FROM activities WHERE date = today`)

## 3. NestJS — InternalController

- [x] 3.1 Remover handler `weeklyAbsenceCheck()` e a rota `POST /internal/weekly-absence-check`
- [x] 3.2 Adicionar handler `weeklyJob()` para `POST /internal/weekly-job` que chama `internalService.checkWeeklyAbsence()`
- [x] 3.3 Adicionar handler `dailyJob()` para `POST /internal/daily-job` que chama `internalService.checkDailyActivitiesAndSendNotifications()`

## 4. Idempotência do daily-job

- [x] 4.1 Adicionar verificação de idempotência em `checkDailyActivitiesAndSendNotifications()` usando `internal_job_runs` com `job_name = 'daily-job'` e janela de dia (`date_trunc('day', now())`)
- [x] 4.2 Registrar execução em `internal_job_runs` com `job_name = 'daily-job'` ao final da rotina

## 5. Idempotência do weekly-job

- [x] 5.1 Alterar o `job_name` do registro de idempotência de `'weekly-absence-check'` para `'weekly-job'` dentro de `checkWeeklyAbsence()`

## 6. Infraestrutura — Migrations

- [x] 6.1 Criar migration para unschedule dos crons antigos: `cron.unschedule('daily-activity-notifications')` e `cron.unschedule('weekly-absence-check')`
- [x] 6.2 Criar migration para schedule dos novos crons: `daily-job` (todo dia 03:00 UTC) e `weekly-job` (toda segunda 03:00 UTC) chamando a API NestJS diretamente via `net.http_post` com `API_URL` e `INTERNAL_JOB_SECRET` hardcoded

## 7. Infraestrutura — Edge Functions

- [ ] 7.1 Deletar a pasta `src/database/supabase/functions/weekly-absence-trigger/`

## 8. Testes — Atualizar e verificar

- [ ] 8.1 Renomear e atualizar `src/test/internal/weekly-absence-check.ts` para o novo endpoint `/internal/weekly-job`
- [ ] 8.2 Verificar que os novos testes de `POST /internal/weekly-job` e `POST /internal/daily-job` passam

## 9. Documentação e qualidade

- [x] 9.1 Atualizar `API.md` com os novos endpoints `POST /internal/daily-job` e `POST /internal/weekly-job` e remover `POST /internal/weekly-absence-check`
- [x] 9.2 Verificar ausência de erros de lint nos arquivos modificados e rodar `npm test`
