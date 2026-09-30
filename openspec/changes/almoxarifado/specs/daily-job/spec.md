## MODIFIED Requirements

### Requirement: Executar rotinas diárias via endpoint interno
O sistema SHALL expor `POST /internal/daily-job` protegido por `X-Internal-Secret` que executa todas as rotinas diárias cadastradas em sequência — incluindo a notificação de atividades agendadas para hoje e a notificação de empréstimos de almoxarifado em atraso (ver [[almoxarifado-overdue-notifications]]) — e retorna um resumo da execução.

#### Scenario: Execução bem-sucedida na primeira chamada do dia
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job ainda não foi executado hoje (sem registro em `internal_job_runs` para `job_name = 'daily-job'` na janela do dia atual)
- **THEN** o sistema executa todas as rotinas diárias em sequência, incluindo a checagem de empréstimos de almoxarifado em atraso
- **AND** registra a execução em `internal_job_runs` com `job_name = 'daily-job'`
- **AND** retorna HTTP 200 com resumo da execução, incluindo a contagem de notificações de atividades e a contagem de notificações de atraso de empréstimo criadas

#### Scenario: Segunda chamada no mesmo dia (idempotência)
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job já foi executado hoje (existe registro em `internal_job_runs` para `job_name = 'daily-job'` no dia atual)
- **THEN** o sistema retorna HTTP 409 sem executar nenhuma rotina, incluindo a de empréstimos em atraso

#### Scenario: Requisição sem secret ou com secret inválido
- **WHEN** o endpoint recebe uma requisição sem o header `X-Internal-Secret` ou com valor inválido
- **THEN** o sistema retorna HTTP 401
