## MODIFIED Requirements

### Requirement: Clock-in — iniciar sessão de trabalho

O sistema SHALL expor `POST /time-entries/clock-in` que cria uma nova sessão de trabalho para o usuário autenticado. O endpoint não aceita request body — o timestamp de entrada é sempre gerado pelo banco via `now()`.

#### Scenario: Clock-in bem-sucedido
- **WHEN** o usuário autenticado não possui nenhuma sessão com `clocked_out_at IS NULL`
- **THEN** o sistema SHALL inserir uma nova row em `time_entries` com `clocked_in_at = now()`, `clocked_out_at = NULL`, `is_valid = NULL` e retornar HTTP 201 com `{ id, clocked_in_at }`

#### Scenario: Clock-in rejeitado — sessão já aberta
- **WHEN** o usuário autenticado já possui uma sessão com `clocked_out_at IS NULL`
- **THEN** o sistema SHALL retornar HTTP 409 com mensagem `"Você já possui uma sessão de trabalho em aberto"`

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401

---

### Requirement: Clock-out — encerrar sessão de trabalho

O sistema SHALL expor `POST /time-entries/clock-out` que encerra a sessão aberta do usuário autenticado, marcando-a como válida ou anulada conforme a duração. O endpoint não aceita request body — o timestamp de saída é sempre gerado pelo banco via `now()`.

#### Scenario: Clock-out com duração dentro do limite (≤ 8h)
- **WHEN** o usuário possui sessão aberta e `now() - clocked_in_at <= 8 horas`
- **THEN** o sistema SHALL setar `clocked_out_at = now()`, `is_valid = TRUE`, `annulled_reason = NULL` e retornar HTTP 200:
  ```json
  {
    "status": "valid",
    "id": "uuid",
    "clocked_in_at": "...",
    "clocked_out_at": "...",
    "duration_minutes": <número>
  }
  ```

#### Scenario: Clock-out com duração excedida (> 8h)
- **WHEN** o usuário possui sessão aberta e `now() - clocked_in_at > 8 horas`
- **THEN** o sistema SHALL setar `clocked_out_at = now()`, `is_valid = FALSE`, `annulled_reason = 'exceeded_max_duration'` e retornar HTTP 200:
  ```json
  {
    "status": "annulled",
    "reason": "exceeded_max_duration",
    "id": "uuid",
    "clocked_in_at": "...",
    "clocked_out_at": "...",
    "duration_minutes": <número>
  }
  ```

#### Scenario: Clock-out sem sessão aberta
- **WHEN** o usuário autenticado não possui nenhuma sessão com `clocked_out_at IS NULL`
- **THEN** o sistema SHALL retornar HTTP 409 com mensagem `"Nenhuma sessão de trabalho em aberto"`

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401

---

### Requirement: Summary do próprio usuário

O sistema SHALL expor `GET /time-entries/summary/me` que retorna as sessões válidas da semana corrente (segunda a domingo) e o estado da sessão atual do usuário autenticado.

#### Scenario: Summary do próprio usuário
- **WHEN** usuário autenticado faz `GET /time-entries/summary/me`
- **THEN** o sistema SHALL retornar HTTP 200 com o shape completo (ver design.md), onde `valid_sessions` contém apenas sessões com `is_valid = TRUE` dentro da semana corrente e `total_minutes` é a soma das durações dessas sessões

#### Scenario: `current_session` — nenhuma sessão aberta
- **WHEN** o usuário autenticado não possui sessão com `clocked_out_at IS NULL`
- **THEN** `current_session` SHALL ser `{ "status": "none" }`

#### Scenario: `current_session` — sessão aberta válida
- **WHEN** o usuário autenticado possui sessão aberta e `now() - clocked_in_at <= 8 horas`
- **THEN** `current_session` SHALL ser `{ "status": "open", "clocked_in_at": "...", "elapsed_minutes": <número> }`

#### Scenario: `current_session` — sessão aberta inválida
- **WHEN** o usuário autenticado possui sessão aberta e `now() - clocked_in_at > 8 horas`
- **THEN** `current_session` SHALL ser `{ "status": "invalid", "reason": "exceeded_max_duration", "clocked_in_at": "...", "elapsed_minutes": <número> }`

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401

---

### Requirement: Summary de outro usuário — superusuário

O sistema SHALL expor `GET /time-entries/summary/:userId` que retorna o summary da semana corrente do usuário especificado no path, restrito a superusuários.

#### Scenario: Summary de outro usuário — superusuário
- **WHEN** usuário com rank >= 3 faz `GET /time-entries/summary/:userId`
- **THEN** o sistema SHALL retornar HTTP 200 com o summary do usuário solicitado

#### Scenario: Summary de outro usuário — sem permissão
- **WHEN** usuário com rank < 3 faz `GET /time-entries/summary/:userId` de outro usuário
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401

## REMOVED Requirements

### Requirement: Summary — resumo semanal

**Reason:** Substituído por dois endpoints distintos: `GET /time-entries/summary/me` para o próprio usuário e `GET /time-entries/summary/:userId` para superusuários consultando outros usuários. O mecanismo de `?user_id` query param foi removido em favor de path params explícitos.
**Migration:** Substituir `GET /time-tracking/summary` por `GET /time-entries/summary/me`. Para consulta de outro usuário, usar `GET /time-entries/summary/:userId`.
