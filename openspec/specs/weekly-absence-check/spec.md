### Requirement: Endpoint POST /internal/weekly-absence-check
`POST /internal/weekly-absence-check` SHALL verificar, para todos os usuários ativos, o total de minutos válidos registrados na semana anterior (segunda a domingo, em UTC) e aplicar a falta correspondente a quem ficou abaixo de `min_week_hours`. O endpoint SHALL operar de forma autônoma — sem parâmetros de entrada, obtendo todos os dados via queries internas.

Regra de seleção de norma:
- `total_minutes >= min_week_hours * 60` → nenhuma falta
- `total_minutes >= (min_week_hours / 2) * 60` → falta AN07
- `total_minutes < (min_week_hours / 2) * 60` → falta AN13

Após processar, o endpoint SHALL retornar 200 com um resumo da execução (`users_checked`, `violations_applied`, `week_start`).

#### Scenario: Usuário com horas suficientes não recebe falta
- **WHEN** o job é executado e um usuário registrou `total_minutes >= min_week_hours * 60`
- **THEN** nenhuma violation é criada para esse usuário

#### Scenario: Usuário com metade ou mais das horas recebe AN07
- **WHEN** o job é executado e um usuário registrou `(min_week_hours / 2) * 60 <= total_minutes < min_week_hours * 60`
- **THEN** uma violation com norm `AN07` e `source = 'automatic'` é inserida para esse usuário

#### Scenario: Usuário com menos da metade das horas recebe AN13
- **WHEN** o job é executado e um usuário registrou `total_minutes < (min_week_hours / 2) * 60`
- **THEN** uma violation com norm `AN13` e `source = 'automatic'` é inserida para esse usuário

#### Scenario: Email de notificação é enviado para cada falta aplicada
- **WHEN** o job aplica uma falta automática a um usuário
- **THEN** um email de notificação SHALL ser enviado via `EmailService` (falha no email não cancela a falta)

#### Scenario: Usuários inativos são ignorados
- **WHEN** o job é executado e existe um usuário com `inactive = true`
- **THEN** esse usuário não é avaliado nem recebe falta

#### Scenario: Resposta de sucesso inclui resumo
- **WHEN** o job é executado com sucesso (sem duplicata)
- **THEN** o endpoint retorna 200 com `{ week_start, users_checked, violations_applied }`

### Requirement: Supabase Edge Function como gatilho
Uma Supabase Edge Function `weekly-absence-trigger` SHALL disparar `POST /internal/weekly-absence-check` toda segunda-feira às 03:00 UTC (meia-noite BRT), agendada via pg_cron. A função SHALL incluir o header `X-Internal-Secret` obtido de variável de ambiente do Supabase.

#### Scenario: Edge Function dispara o endpoint no horário correto
- **WHEN** pg_cron executa a schedule `0 3 * * 1`
- **THEN** a Edge Function `weekly-absence-trigger` é invocada e chama `POST /internal/weekly-absence-check`

#### Scenario: Falha no endpoint não derruba a Edge Function silenciosamente
- **WHEN** o endpoint retorna status >= 400
- **THEN** a Edge Function registra o erro no console e retorna status de falha para o pg_cron
