## ADDED Requirements

### Requirement: Executar rotinas diárias via endpoint interno
O sistema SHALL expor `POST /internal/daily-job` protegido por `X-Internal-Secret` que executa todas as rotinas diárias cadastradas em sequência e retorna um resumo da execução.

#### Scenario: Execução bem-sucedida na primeira chamada do dia
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job ainda não foi executado hoje (sem registro em `internal_job_runs` para `job_name = 'daily-job'` na janela do dia atual)
- **THEN** o sistema executa todas as rotinas diárias em sequência
- **AND** registra a execução em `internal_job_runs` com `job_name = 'daily-job'`
- **AND** retorna HTTP 200 com resumo da execução

#### Scenario: Segunda chamada no mesmo dia (idempotência)
- **WHEN** o endpoint recebe uma requisição com `X-Internal-Secret` válido
- **AND** o job já foi executado hoje (existe registro em `internal_job_runs` para `job_name = 'daily-job'` no dia atual)
- **THEN** o sistema retorna HTTP 409 sem executar nenhuma rotina

#### Scenario: Requisição sem secret ou com secret inválido
- **WHEN** o endpoint recebe uma requisição sem o header `X-Internal-Secret` ou com valor inválido
- **THEN** o sistema retorna HTTP 401

### Requirement: Rotina diária — notificações de atividades agendadas
O sistema SHALL, como parte do `daily-job`, identificar atividades agendadas para o dia corrente (no fuso `America/Sao_Paulo`) e criar notificações para os usuários responsáveis.

#### Scenario: Existem atividades agendadas para hoje
- **WHEN** o daily-job é executado
- **AND** existem registros na tabela `activities` com `date` igual à data atual em `America/Sao_Paulo`
- **THEN** o sistema cria um registro em `notifications` para cada atividade, com `title = 'Atividade agendada para hoje: ' || name`, `description` da atividade e `origin = 'automatic'`

#### Scenario: Não há atividades agendadas para hoje
- **WHEN** o daily-job é executado
- **AND** não existem registros em `activities` com `date` igual à data atual em `America/Sao_Paulo`
- **THEN** o sistema não cria notificações e continua sem erro
