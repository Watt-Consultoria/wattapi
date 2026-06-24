## Context

A aplicação usa Supabase pg_cron para disparar rotinas agendadas. Hoje o fluxo semanal passa por uma camada intermediária de Edge Function (`weekly-absence-trigger`) que age como proxy entre o pg_cron e a API NestJS. A rotina diária (`daily-activity-notifications`) roda SQL puro diretamente no pg_cron, sem passar pelo NestJS.

À medida que mais rotinas são adicionadas, esse modelo gera fragmentação: cada nova rotina exige um endpoint próprio, um cron próprio e potencialmente uma Edge Function própria.

## Goals / Non-Goals

**Goals:**
- Um único endpoint por frequência (`/internal/daily-job`, `/internal/weekly-job`)
- Todas as rotinas de uma mesma frequência vivem no service e são orquestradas pelo controller
- Eliminar a camada de Edge Functions (simplificação de infraestrutura)
- pg_cron chama a API NestJS diretamente via `net.http_post`
- Idempotência via `internal_job_runs` para ambas as frequências

**Non-Goals:**
- Paralelização das rotinas dentro de um mesmo job (execução é sequencial)
- Sistema de filas ou retry automático
- Observabilidade avançada (logs além do que já existe)

## Decisions

### 1. Controller como orquestrador, service com a lógica

O controller (`InternalController`) tem um handler por frequência que chama métodos do service em sequência. A lógica de negócio fica no service, não no controller.

**Alternativa considerada:** Fat controller com métodos privados. Rejeitada por violar o padrão NestJS/SOLID — controllers devem ser finos.

### 2. Eliminar Edge Functions como proxy

O pg_cron chama `/internal/daily-job` e `/internal/weekly-job` diretamente via `net.http_post`, com `API_URL` e `INTERNAL_JOB_SECRET` hardcoded na migration do cron.

**Alternativa considerada:** Manter Edge Functions como proxy para isolar secrets do banco. Rejeitada pelo time — simplicidade preferida à segurança adicional neste contexto.

### 3. Idempotência no nível do job, não da rotina

A tabela `internal_job_runs` registra `job_name = 'daily-job'` e `job_name = 'weekly-job'` por janela de tempo (dia/semana). Se o endpoint for chamado duas vezes na mesma janela, retorna 409.

**Alternativa considerada:** Idempotência por rotina individual. Rejeitada por complexidade — um cron não deve disparar duas vezes na mesma janela em condições normais.

### 4. Remoção imediata do endpoint legado

`POST /internal/weekly-absence-check` é removido sem período de transição. O único consumidor era o cron `weekly-absence-check`, que será substituído pelo novo cron `weekly-job`.

## Risks / Trade-offs

- **`API_URL` e `INTERNAL_JOB_SECRET` hardcoded em migration** → Ficam no histórico do git. Risco aceito conscientemente pelo time.
- **`net.http_post` no pg_cron é fire-and-forget** → Erros HTTP da API NestJS não causam falha visível no cron. Mitigação: logs da aplicação NestJS capturam falhas.
- **Execução sequencial das rotinas** → Se uma rotina falhar no meio, as seguintes não executam. Mitigação: cada rotina tem try/catch para garantir isolamento (a implementar conforme rotinas crescem).

## Migration Plan

1. Deploy da nova versão da API (novos endpoints, endpoint legado removido)
2. Rodar migration que unschedule crons antigos e schedule novos
3. Deletar pasta `src/database/supabase/functions/weekly-absence-trigger/` e fazer deploy das Edge Functions no Supabase

**Rollback:** Reverter migration (unschedule novos crons, reschedule antigos) e reverter deploy da API.
