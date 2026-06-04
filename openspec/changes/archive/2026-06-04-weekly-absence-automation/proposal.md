## Why

Não existe mecanismo automático para registrar faltas de horas semanais — hoje isso exige ação manual toda segunda-feira. A automação elimina o trabalho operacional e garante consistência na aplicação das normas AN07 e AN13.

## What Changes

- **Nova coluna `source`** em `member_violations`: enum `'manual' | 'automatic'`, NOT NULL DEFAULT `'manual'`
- **`applied_by` passa a ser nullable** em `member_violations`: permitido apenas quando `source = 'automatic'` (constraint CHECK)
- **Nova tabela `internal_job_runs`**: registra execuções de jobs internos para garantir idempotência
- **Novo namespace `/internal`**: endpoints desprotegidos de JWT, autenticados apenas por `X-Internal-Secret` header; extensível para futuros jobs
- **Novo endpoint `POST /internal/weekly-absence-check`**: verifica horas da semana anterior para todos os usuários ativos, aplica AN07 (cumpriu >= metade) ou AN13 (cumpriu < metade) para quem ficou abaixo de `min_week_hours`, envia email via `EmailService`, registra execução em `internal_job_runs`
- **Supabase Edge Function `weekly-absence-trigger`**: disparada por pg_cron toda segunda-feira às 03:00 UTC (meia-noite BRT), chama o endpoint interno com o secret

## Capabilities

### New Capabilities

- `internal-jobs`: Infraestrutura do namespace `/internal` — guard de secret header, tabela `internal_job_runs`, contrato de idempotência para jobs recorrentes
- `weekly-absence-check`: Lógica do job de ausência semanal — cálculo de horas, seleção de norma (AN07/AN13), aplicação de violation com `source = 'automatic'`, envio de email, prevenção de duplicata via `internal_job_runs`

### Modified Capabilities

- `violations-crud`: modelo de dados alterado — `applied_by` passa a ser nullable; nova coluna `source` com constraint CHECK garante que `applied_by IS NULL` implica `source = 'automatic'`

## Impact

- **Migrations**: alter `member_violations` (nullable `applied_by`, coluna `source`, constraint CHECK); nova tabela `internal_job_runs`
- **InternalModule**: novo módulo NestJS com controller, service e guard de secret header
- **ViolationsService**: pequeno ajuste — `applied_by` opcional no insert; `toResponse` e tipos refletindo nullable
- **violation.dto.ts**: `applied_by` como `string | null` em `ViolationRow` e `ViolationResponseWithAppliedBy`
- **Supabase Edge Function**: `supabase/functions/weekly-absence-trigger/index.ts` em Deno
- **pg_cron**: migration que registra schedule `0 3 * * 1`
- **Nova env var**: `INTERNAL_JOB_SECRET` (NestJS) e mesma variável configurada no Supabase como secret da edge function
