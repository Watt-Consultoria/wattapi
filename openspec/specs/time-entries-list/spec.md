### Requirement: Listagem semanal de horas por membro

O sistema SHALL expor `GET /time-entries` que retorna uma lista agregada de todos os usuários com `inactive = FALSE` com o total de minutos de sessões válidas na semana selecionada, além da flag de cumprimento da meta mínima de horas semanais definida nas settings globais. Usuários soft-deletados (`inactive = TRUE`) SHALL ser excluídos do retorno em qualquer circunstância.

O query param `week` (inteiro >= 0, padrão `0`) seleciona a semana: `0` = semana corrente, `1` = semana anterior, `n` = n semanas atrás. O intervalo da semana é calculado com base na semana ISO (segunda a domingo) usando `date_trunc('week', ...)`.

O endpoint é restrito a superusuários (rank >= 3).

#### Scenario: Listagem da semana corrente (padrão)
- **WHEN** superusuário faz `GET /time-entries` sem query params
- **THEN** o sistema SHALL retornar HTTP 200 com a lista de todos os usuários ativos referente à semana corrente, onde `week` omitido equivale a `week=0`

#### Scenario: Listagem de semana anterior via query param
- **WHEN** superusuário faz `GET /time-entries?week=1`
- **THEN** o sistema SHALL retornar HTTP 200 com a lista referente à semana anterior (7 dias atrás)

#### Scenario: Listagem com offset arbitrário
- **WHEN** superusuário faz `GET /time-entries?week=<n>` para qualquer inteiro n >= 0
- **THEN** o sistema SHALL retornar HTTP 200 com a lista referente à semana que começou `n * 7` dias antes da semana corrente

#### Scenario: Shape do retorno — membro com horas suficientes
- **WHEN** um membro possui `total_minutes >= min_week_hours * 60` na semana selecionada
- **THEN** o sistema SHALL incluir `{ "user_id": "<uuid>", "name": "<string>", "total_minutes": <número>, "min_hours_met": true }` no array `members`

#### Scenario: Shape do retorno — membro sem horas suficientes
- **WHEN** um membro possui `total_minutes < min_week_hours * 60` na semana selecionada (inclusive zero)
- **THEN** o sistema SHALL incluir `{ "user_id": "<uuid>", "name": "<string>", "total_minutes": <número>, "min_hours_met": false }` no array `members`

#### Scenario: Membro sem sessões na semana selecionada
- **WHEN** um usuário ativo não possui sessões válidas na semana selecionada
- **THEN** o sistema SHALL incluir o membro no array `members` com `total_minutes: 0` e `min_hours_met: false`

#### Scenario: Shape do envelope de resposta
- **WHEN** a requisição é bem-sucedida
- **THEN** o sistema SHALL retornar o envelope:
  ```json
  {
    "week_start": "<YYYY-MM-DD>",
    "week_end": "<YYYY-MM-DD>",
    "min_week_hours": <número>,
    "members": [...]
  }
  ```
  onde `week_start` é a segunda-feira e `week_end` é o domingo da semana selecionada

#### Scenario: Membros soft-deletados não aparecem na listagem
- **WHEN** um usuário possui `inactive = TRUE` na tabela `users`
- **THEN** o sistema SHALL omitir esse usuário do array `members`, independentemente de possuir sessões na semana selecionada

#### Scenario: Query param `week` com valor inválido
- **WHEN** superusuário faz `GET /time-entries?week=abc` ou `?week=-1`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Acesso negado — usuário não superusuário
- **WHEN** usuário com rank < 3 faz `GET /time-entries`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário não autenticado
- **WHEN** o request não possui token JWT válido
- **THEN** o sistema SHALL retornar HTTP 401
