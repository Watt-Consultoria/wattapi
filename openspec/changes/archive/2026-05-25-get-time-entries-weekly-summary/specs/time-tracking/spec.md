## MODIFIED Requirements

### Requirement: Summary do próprio usuário

O sistema SHALL expor `GET /time-entries/summary/me` que retorna as sessões válidas da semana corrente (segunda a domingo) e o estado da sessão atual do usuário autenticado, incluindo a flag `min_hours_met` que indica se o total de minutos válidos da semana atinge a meta mínima definida em `min_week_hours` nas settings globais.

#### Scenario: Summary do próprio usuário
- **WHEN** usuário autenticado faz `GET /time-entries/summary/me`
- **THEN** o sistema SHALL retornar HTTP 200 com o shape completo (ver design.md), onde `valid_sessions` contém apenas sessões com `is_valid = TRUE` dentro da semana corrente, `total_minutes` é a soma das durações dessas sessões, e `min_hours_met` é `true` se `total_minutes >= min_week_hours * 60`, caso contrário `false`

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

O sistema SHALL expor `GET /time-entries/summary/:userId` que retorna o summary da semana corrente do usuário especificado no path, restrito a superusuários (rank >= 3), incluindo o campo `min_hours_met` que indica se o total de minutos válidos da semana atinge a meta mínima definida em `min_week_hours` nas settings globais.

#### Scenario: Summary de outro usuário — superusuário
- **WHEN** usuário com rank >= 3 faz `GET /time-entries/summary/:userId`
- **THEN** o sistema SHALL retornar HTTP 200 com o summary do usuário solicitado, contendo `min_hours_met: true` se `total_minutes >= min_week_hours * 60`, caso contrário `min_hours_met: false`

#### Scenario: Summary de outro usuário — sem permissão
- **WHEN** usuário com rank < 3 faz `GET /time-entries/summary/:userId`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401
