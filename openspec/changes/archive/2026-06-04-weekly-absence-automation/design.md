## Context

O sistema de violations existente exige que um humano autenticado aplique cada falta via `POST /violations`. Não há mecanismo de automação — faltas por horas insuficientes são aplicadas manualmente toda semana, ou simplesmente esquecidas.

O módulo de time-tracking já calcula `total_minutes` por usuário para qualquer semana via `getWeeklySummaryList`. As normas AN07 e AN13 já existem em `company_norms`. O `EmailService` já envia notificações de violation. O que falta é a camada de orquestração automática e a infraestrutura para suportar faltas sem autor humano.

## Goals / Non-Goals

**Goals:**
- Aplicar AN07/AN13 automaticamente toda segunda-feira para a semana anterior
- Garantir idempotência: o job não duplica faltas se disparado mais de uma vez na mesma semana
- Criar um namespace `/internal` reutilizável para futuros jobs automatizados
- Ajustar o schema para modelar corretamente faltas automáticas (sem `applied_by` humano)

**Non-Goals:**
- Não retroativa: não processa semanas anteriores ao deploy
- Não cancelamento automático: faltas automáticas são canceladas manualmente se necessário
- Não cobre outros tipos de ausência além de horas insuficientes
- Não expõe `source` na API pública como filtro

## Decisions

### 1. `applied_by` nullable + coluna `source` (vs. usuário sistema)

**Decisão**: tornar `applied_by` nullable e adicionar coluna `source ENUM('manual','automatic') NOT NULL DEFAULT 'manual'` com `CHECK (applied_by IS NOT NULL OR source = 'automatic')`.

**Alternativa rejeitada**: usuário sistema (UUID fixo em `users`). Seria um dado falso na tabela de usuários, apareceria em listagens, e não é semanticamente correto — "Sistema" não é um membro da empresa.

**Rationale**: o source no schema é a modelagem honesta do fato. O constraint CHECK torna a invariante explícita e garantida pelo banco.

### 2. Endpoint interno vs. NestJS scheduler vs. pg_cron puro

**Decisão**: endpoint `POST /internal/weekly-absence-check` chamado por uma Supabase Edge Function agendada via pg_cron.

**Alternativa rejeitada — NestJS scheduler (`@nestjs/schedule`)**: o processo da API pode não estar de pé exatamente às 00:00 BRT (restarts no Railway). Além disso, acoplaria o lifecycle do job ao processo HTTP.

**Alternativa rejeitada — pg_cron puro (PL/pgSQL)**: envio de email exigiria `pg_net` + chamada HTTP ao Resend diretamente do Postgres. Mais frágil, mais difícil de testar, sem reaproveitamento do `EmailService`.

**Rationale**: o endpoint interno separa o disparo (Edge Function + pg_cron, confiável) da execução (NestJS, onde a lógica já vive). A Edge Function é trivial (~10 linhas Deno) e o NestJS reaproveita 100% do código existente.

### 3. Autenticação do namespace `/internal`

**Decisão**: sem JWT. Apenas header `X-Internal-Secret` comparado com env var `INTERNAL_JOB_SECRET` via string comparison em timing-safe. Qualquer request sem o header correto recebe 401.

**Rationale**: endpoints internos não representam usuários — JWT não faz sentido aqui. Um secret compartilhado é suficiente para este threat model (endpoint não exposto publicamente, apenas chamado pela Edge Function do mesmo projeto Supabase).

### 4. Idempotência via `internal_job_runs`

**Decisão**: tabela `internal_job_runs(id, job_name, week_start DATE, ran_at TIMESTAMPTZ)` com UNIQUE constraint em `(job_name, week_start)`. O endpoint verifica existência antes de processar; se já existe registro para `week_start` daquela semana, retorna 200 sem fazer nada.

**Rationale**: reutilizável por qualquer job futuro no namespace `/internal`. Preferível a checar `member_violations` diretamente (que exigiria lógica específica por job).

### 5. Definição de "semana anterior"

**Decisão**: semana anterior = segunda a domingo, calculada em UTC. O pg_cron dispara `0 3 * * 1` (03:00 UTC = 00:00 BRT). `week_start = date_trunc('week', now() - interval '1 week')` no Postgres.

**Rationale**: `date_trunc('week', ...)` no Postgres usa ISO week (segunda = início). Consistente com o `getWeeklySummaryList` que já usa `date_trunc('week', now())` para a semana atual.

### 6. Lógica de seleção de norma

```
total_minutes >= min_week_hours * 60      → sem falta
total_minutes >= (min_week_hours / 2) * 60 → AN07 (leve)
total_minutes <  (min_week_hours / 2) * 60 → AN13 (moderada)
```

AN07 e AN13 são buscados por code (`SELECT id FROM company_norms WHERE code = 'AN07'`) dentro do job — sem hardcode de UUID.

## Risks / Trade-offs

- **Railway fora do ar na hora do disparo** → a Edge Function falha; o pg_cron pode ser configurado com retry. Como a idempotência está garantida, um retry manual é seguro.
- **`applied_by` nullable quebra type safety em TypeScript** → `ViolationRow.applied_by` passa a `string | null`; ajustar em `toResponse` e `ViolationResponseWithAppliedBy`.
- **`min_week_hours` muda no meio da semana** → o job usa o valor no momento da execução (segunda-feira), que é o mais recente. Aceitável.
- **Usuário inativo na semana de processamento** → filtrar `WHERE u.inactive = false` no momento do job. Se o usuário foi desativado após a semana de referência, não receberá falta automática.

## Migration Plan

1. Deploy da migration: `ALTER TABLE member_violations ALTER COLUMN applied_by DROP NOT NULL`, `ADD COLUMN source ...`, `ADD CONSTRAINT ...`
2. Deploy da migration: `CREATE TABLE internal_job_runs ...`
3. Deploy do código NestJS (InternalModule + ajustes em violations)
4. Deploy da Edge Function no Supabase (`supabase functions deploy weekly-absence-trigger`)
5. Aplicar migration do pg_cron schedule
6. Verificar primeira execução na segunda-feira seguinte
