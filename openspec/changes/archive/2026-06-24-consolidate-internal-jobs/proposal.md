## Why

Com o crescimento da aplicação, rotinas agendadas (cron jobs) tendem a se multiplicar. Hoje cada rotina tem seu próprio endpoint `/internal/*` e seu próprio cron separado, gerando fragmentação. Consolidar em dois endpoints — `/internal/daily-job` e `/internal/weekly-job` — cria um ponto único de entrada por frequência, simplifica o agendamento e elimina a camada de Edge Functions desnecessária.

## What Changes

- **BREAKING** Remover endpoint `POST /internal/weekly-absence-check`
- Adicionar endpoint `POST /internal/daily-job` — orquestra todas as rotinas diárias
- Adicionar endpoint `POST /internal/weekly-job` — orquestra todas as rotinas semanais
- Migrar lógica de `weeklyAbsenceCheck()` para `checkWeeklyAbsence()` chamada pelo novo endpoint semanal
- Migrar lógica do pg_cron `daily-activity-notifications` (SQL direto) para `checkDailyActivitiesAndSendNotifications()` chamada pelo novo endpoint diário
- Deletar Supabase Edge Function `weekly-absence-trigger` (camada de proxy desnecessária)
- Substituir crons existentes por dois novos que chamam a API NestJS diretamente via `net.http_post`

## Capabilities

### New Capabilities

- `daily-job`: Endpoint interno que executa todas as rotinas diárias em sequência, com idempotência via `internal_job_runs`
- `weekly-job`: Endpoint interno que executa todas as rotinas semanais em sequência, com idempotência via `internal_job_runs`

### Modified Capabilities

## Impact

- `src/modules/internal/internal.controller.ts` — remover handler `weeklyAbsenceCheck`, adicionar handlers `dailyJob` e `weeklyJob`
- `src/modules/internal/internal.service.ts` — renomear método, adicionar `checkDailyActivitiesAndSendNotifications()`
- `src/database/supabase/functions/weekly-absence-trigger/` — deletar pasta inteira
- `src/database/supabase/migrations/` — nova migration para unschedule dos crons antigos e schedule dos novos
- `src/test/internal/weekly-absence-check.ts` — renomear/atualizar para o novo endpoint
