## Why

Gestores precisam de uma visão consolidada do desempenho de horas semanais de todos os membros, incluindo comparação com a meta mínima definida globalmente (`min-week-hour`). Hoje nenhum endpoint agrega essa informação para a equipe inteira, e os resumos individuais também não expõem se o membro cumpriu ou não o mínimo.

## What Changes

- Novo endpoint `GET /time-entries` que retorna lista de todos os membros com o total de minutos válidos na semana selecionada e indicação de cumprimento da meta mínima de horas.
- Query param `week` (padrão `0`) seleciona a semana: `0` = semana atual, `1` = semana anterior, `n` = n semanas atrás.
- Os endpoints `GET /time-entries/summary/me` e `GET /time-entries/summary/:userId` passam a incluir o campo `min_hours_met` no retorno, indicando se o total de horas válidas da semana atinge o valor de `min-week-hour` das settings globais.

## Capabilities

### New Capabilities

- `time-entries-list`: Endpoint `GET /time-entries` que agrega horas válidas por membro para uma semana selecionada via query param, com flag de cumprimento da meta mínima de horas semanais.

### Modified Capabilities

- `time-tracking`: Os summaries individuais (`/summary/me` e `/summary/:userId`) passam a incluir o campo `min_hours_met` (boolean) comparando o total de horas válidas da semana com o valor global de `min-week-hour`.

## Impact

- Novo route handler em `src/http/routes/time-tracking/` ou equivalente
- Consulta agrupada por usuário em `time_entries` com filtro de intervalo de semana
- Leitura da setting `min-week-hour` de `app_settings` para cálculo do cumprimento
- Endpoints de summary existentes precisam ser estendidos com o campo `min_hours_met`
- Restrito a superusuários (rank >= 3) para o endpoint de listagem geral; summaries individuais seguem permissões já existentes
