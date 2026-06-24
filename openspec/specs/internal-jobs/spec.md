### Requirement: Namespace /internal com autenticação por secret header
O namespace `/internal` SHALL expor endpoints de jobs automatizados sem exigir JWT. Toda requisição ao namespace SHALL incluir o header `X-Internal-Secret` com valor igual à env var `INTERNAL_JOB_SECRET`. Requisições sem o header ou com valor incorreto SHALL retornar 401.

#### Scenario: Requisição sem header retorna 401
- **WHEN** `POST /internal/daily-job` é chamado sem o header `X-Internal-Secret`
- **THEN** o sistema retorna 401 Unauthorized

#### Scenario: Requisição com secret incorreto retorna 401
- **WHEN** `POST /internal/weekly-job` é chamado com `X-Internal-Secret` com valor incorreto
- **THEN** o sistema retorna 401 Unauthorized

#### Scenario: Requisição com secret correto é aceita
- **WHEN** `POST /internal/daily-job` é chamado com `X-Internal-Secret` correto
- **THEN** o sistema processa a requisição normalmente

### Requirement: Tabela internal_job_runs para idempotência
A tabela `internal_job_runs` SHALL registrar cada execução de job interno com os campos: `id` (UUID, PK), `job_name` (TEXT, NOT NULL), `week_start` (DATE, NOT NULL), `ran_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()). SHALL existir um UNIQUE constraint em `(job_name, week_start)` para impedir execuções duplicadas da mesma janela de tempo.

#### Scenario: Registro de execução bem-sucedida
- **WHEN** um job interno é executado com sucesso
- **THEN** um registro é inserido em `internal_job_runs` com `job_name` e `week_start` corretos

#### Scenario: Tentativa de duplicata é bloqueada no weekly-job
- **WHEN** `POST /internal/weekly-job` é chamado duas vezes na mesma semana
- **THEN** na segunda chamada o sistema retorna 409 sem processar nenhuma rotina (registro já existe em `internal_job_runs`)

#### Scenario: Tentativa de duplicata é bloqueada no daily-job
- **WHEN** `POST /internal/daily-job` é chamado duas vezes no mesmo dia
- **THEN** na segunda chamada o sistema retorna 409 sem processar nenhuma rotina (registro já existe em `internal_job_runs`)
