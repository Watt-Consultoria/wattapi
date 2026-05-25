## Context

A API já possui autenticação JWT, sistema de roles com hierarquia ordinal e guard de políticas de rota (`RoutePolicyGuard`). O time tracking se apoia nessa infraestrutura existente: todo endpoint exige token válido com usuário cadastrado em `public.users`.

O requisito central é simples — registrar entrada e saída de cada colaborador — mas exige lógica cuidadosa para evitar estados inválidos: sessões em aberto duplicadas, sessões que excedem o limite de 8 horas sem feedback, e cálculo correto do total semanal ignorando registros anulados.

## Goals / Non-Goals

**Goals:**
- Tabela `time_entries` com suporte a múltiplas sessões por dia por usuário
- Clock-in rejeita se já existe sessão aberta (409)
- Clock-out sempre fecha a sessão; se > 8h, marca como anulada com motivo em vez de rejeitar
- Summary retorna sessões válidas da semana + estado computado da sessão atual (none / open / invalid)
- Superusuários (rank >= 3) podem consultar o summary de qualquer usuário via `?user_id=`

**Non-Goals:**
- Edição de registros de ponto
- Fechamento automático de sessões (midnight close, cron, etc.)
- Paginação de sessões históricas

## Schema

```sql
CREATE TABLE time_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id),
  clocked_in_at   timestamptz NOT NULL DEFAULT now(),
  clocked_out_at  timestamptz,
  is_valid        boolean,
  annulled_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clock_out_after_clock_in
    CHECK (clocked_out_at IS NULL OR clocked_out_at > clocked_in_at)
);

CREATE UNIQUE INDEX one_open_session_per_user
  ON time_entries (user_id)
  WHERE clocked_out_at IS NULL;
```

O índice parcial garante no nível do banco que cada usuário pode ter no máximo uma sessão aberta simultânea.

`is_valid = NULL` enquanto a sessão está aberta. Ao fechar: `TRUE` (válida) ou `FALSE` (anulada). `annulled_reason` só é preenchido quando `is_valid = FALSE`.

## Decisions

### 1. Sessões anuladas são fechadas, não rejeitadas

**Decisão:** Clock-out com duração > 8h fecha a sessão e seta `is_valid = FALSE, annulled_reason = 'exceeded_max_duration'`. O response inclui `status: 'annulled'` e o motivo.

**Alternativa descartada:** Retornar 422 e não fechar a sessão. Isso deixa o usuário "preso" com sessão aberta que não pode fechar sozinho — péssima UX e exigiria endpoint de correção admin.

### 2. Estado `invalid` no summary é computado em runtime, não salvo

**Decisão:** Uma sessão aberta com `now() - clocked_in_at > 8h` aparece no summary como `current_session: { status: 'invalid' }`. O banco não é alterado — a sessão ainda está aberta. O frontend pode exibir aviso proativo antes do clock-out.

**Razão:** Manter a sessão no banco como "aberta" (`clocked_out_at IS NULL`) é o estado correto — ela ainda não foi fechada. Gravar `invalid` antes do clock-out criaria ambiguidade entre "invalidada antes do fechamento" e "fechada e anulada".

### 3. Total semanal filtra apenas `is_valid = TRUE`

**Decisão:** `SUM(clocked_out_at - clocked_in_at)` conta só sessões onde `is_valid = TRUE`. Sessões anuladas e sessões abertas não entram no total.

**Razão:** Sessão anulada não representa horas trabalháveis. Sessão aberta ainda não terminou — incluí-la no total seria especulação.

### 4. Semana = segunda a domingo via `date_trunc('week', now())`

**Decisão:** O `date_trunc('week', ...)` do Postgres trunca para segunda-feira por padrão (ISO 8601). Nenhuma lógica de timezone customizada por enquanto — timestamps são UTC no banco.

### 5. Acesso ao summary de outros usuários via query param

**Decisão:** `GET /time-tracking/summary?user_id=<uuid>` — superusuários (rank >= 3) podem passar `user_id` para consultar outro colaborador. Sem `user_id`, retorna o próprio.

**Alternativa descartada:** `GET /time-tracking/summary/:user_id` como rota separada. Desnecessário — o mesmo handler resolve os dois casos.

### 6. Timestamps gerados exclusivamente pelo banco — sem input do cliente

**Decisão:** `clocked_in_at` e `clocked_out_at` são sempre gerados via `now()` no banco — o primeiro pelo `DEFAULT now()` na inserção, o segundo via `SET clocked_out_at = now()` no UPDATE. Nenhum dos dois endpoints aceita body com data/hora. O clock-in e o clock-out não possuem request body.

**Razão:** Permitir que o cliente forneça timestamps criaria surface de manipulação — um usuário poderia falsificar horários de entrada/saída. A fonte de verdade é o relógio do banco, que é neutro e auditável.

### 7. Módulo independente, sem depender de `UsersModule`

**Decisão:** `TimeTrackingModule` importa apenas `DatabaseModule` e `AuthModule` (para o guard). Não importa `UsersModule` — as queries ao banco são feitas diretamente via `DatabaseService`.

**Razão:** Evita acoplamento desnecessário. O `user_id` já vem do JWT, não precisa consultar a tabela `users` nas operações de ponto.

## Response Shapes

### Clock-out — sessão válida
```json
{
  "status": "valid",
  "id": "uuid",
  "clocked_in_at": "2026-05-25T09:00:00Z",
  "clocked_out_at": "2026-05-25T17:00:00Z",
  "duration_minutes": 480
}
```

### Clock-out — sessão anulada
```json
{
  "status": "annulled",
  "reason": "exceeded_max_duration",
  "id": "uuid",
  "clocked_in_at": "2026-05-25T08:00:00Z",
  "clocked_out_at": "2026-05-25T17:00:00Z",
  "duration_minutes": 540
}
```

### Summary
```json
{
  "week_start": "2026-05-25",
  "week_end": "2026-05-31",
  "total_minutes": 960,
  "valid_sessions": [
    {
      "id": "uuid",
      "clocked_in_at": "2026-05-25T09:00:00Z",
      "clocked_out_at": "2026-05-25T13:00:00Z",
      "duration_minutes": 240
    }
  ],
  "current_session": { "status": "none" }
}
```

Estados de `current_session`:
- `{ "status": "none" }` — nenhuma sessão aberta
- `{ "status": "open", "clocked_in_at": "...", "elapsed_minutes": 127 }` — aberta, dentro do limite
- `{ "status": "invalid", "reason": "exceeded_max_duration", "clocked_in_at": "...", "elapsed_minutes": 512 }` — aberta, passou de 8h

## Risks / Trade-offs

- **Sessão aberta por dias** — se o usuário nunca der clock-out, a sessão fica aberta indefinidamente e o summary sempre mostrará `invalid`. Não é tratado agora (Non-goal). Se virar problema real, um cron de fechamento automático pode ser adicionado depois.
- **Timezone** — timestamps são UTC. Se o frontend precisar exibir horário local, a conversão é responsabilidade do cliente.
- **Índice parcial e race condition** — o índice único em `(user_id) WHERE clocked_out_at IS NULL` garante atomicidade no banco. Dois clock-ins simultâneos do mesmo usuário: um recebe 201, o outro recebe erro de constraint único, convertido para 409 no service.
