## ADDED Requirements

### Requirement: Executar rotinas semanais via endpoint interno
O sistema SHALL expor `POST /internal/weekly-job` protegido por `X-Internal-Secret` que executa todas as rotinas semanais cadastradas em sequência e retorna um resumo da execução.

#### Scenario: Execução bem-sucedida na primeira chamada da semana
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job ainda não foi executado nesta semana (sem registro em `internal_job_runs` para `job_name = 'weekly-job'` na janela da semana atual)
- **THEN** o sistema executa todas as rotinas semanais em sequência
- **AND** registra a execução em `internal_job_runs` com `job_name = 'weekly-job'`
- **AND** retorna HTTP 200 com resumo da execução

#### Scenario: Segunda chamada na mesma semana (idempotência)
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job já foi executado nesta semana (existe registro em `internal_job_runs` para `job_name = 'weekly-job'` na semana atual)
- **THEN** o sistema retorna HTTP 409 sem executar nenhuma rotina

#### Scenario: Requisição sem secret ou com secret inválido
- **WHEN** o endpoint recebe uma requisição sem o header `X-Internal-Secret` ou com valor inválido
- **THEN** o sistema retorna HTTP 401

### Requirement: Rotina semanal — verificação de ausência de horas
O sistema SHALL, como parte do `weekly-job`, verificar as horas registradas pelos usuários ativos na semana anterior e aplicar violações automáticas (AN07 ou AN13) para quem não atingiu o mínimo configurado em `min_week_hours`.

#### Scenario: Usuário com horas abaixo da metade do mínimo
- **WHEN** o weekly-job é executado
- **AND** um usuário ativo registrou menos da metade do mínimo semanal em horas válidas
- **THEN** o sistema aplica a violação AN13 ao usuário com `source = 'automatic'`
- **AND** envia email de notificação ao usuário

#### Scenario: Usuário com horas entre metade e o mínimo
- **WHEN** o weekly-job é executado
- **AND** um usuário ativo registrou horas válidas entre a metade e o mínimo semanal
- **THEN** o sistema aplica a violação AN07 ao usuário com `source = 'automatic'`
- **AND** envia email de notificação ao usuário

#### Scenario: Usuário com horas suficientes
- **WHEN** o weekly-job é executado
- **AND** um usuário ativo registrou horas válidas iguais ou superiores ao mínimo semanal
- **THEN** o sistema não aplica nenhuma violação ao usuário

### Requirement: Remoção do endpoint legado weekly-absence-check
O sistema SHALL remover o endpoint `POST /internal/weekly-absence-check`.

#### Scenario: Chamada ao endpoint removido
- **WHEN** um cliente faz `POST /internal/weekly-absence-check`
- **THEN** o sistema retorna HTTP 404
