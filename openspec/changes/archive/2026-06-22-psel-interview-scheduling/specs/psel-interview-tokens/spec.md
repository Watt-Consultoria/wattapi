## ADDED Requirements

### Requirement: Admin envia link de agendamento para candidatos
O sistema SHALL permitir que usuários com role `assessor` ou `presidente` enviem links de agendamento de entrevista para um ou mais candidatos de uma vez. Para cada candidato, o sistema gera um token único, armazena com expiração igual ao `ends_at` do processo seletivo ativo, e envia email com o link `{FRONTEND_URL}/psel/entrevistas/{token}`.

#### Scenario: Envio bem-sucedido para múltiplos candidatos
- **WHEN** admin faz `POST /selection-process/interviews/send-link` com `{ "candidate_ids": ["uuid1", "uuid2"] }` e existe processo ativo
- **THEN** sistema gera tokens únicos para cada candidato, persiste em `psel_interview_tokens` com `expires_at = processo.ends_at`, envia email a cada candidato com o link de agendamento, retorna lista dos candidatos que receberam o email com sucesso

#### Scenario: Rejeição quando não existe processo ativo
- **WHEN** admin faz `POST /selection-process/interviews/send-link` e nenhum processo seletivo está ativo
- **THEN** sistema retorna 404 com mensagem "No active selection process found"

#### Scenario: Rejeição quando candidato não existe
- **WHEN** admin envia `candidate_ids` contendo um ID que não existe na tabela `candidates`
- **THEN** sistema retorna 404 com mensagem indicando o candidato não encontrado

#### Scenario: Reenvio gera novo token
- **WHEN** admin envia `send-link` para um candidato que já recebeu link anteriormente
- **THEN** sistema gera um novo token (sem invalidar o anterior) e envia novo email — ambos os tokens ficam válidos até `expires_at`

#### Scenario: Falha de email não interrompe o lote
- **WHEN** o envio de email falha para um dos candidatos do lote
- **THEN** sistema continua processando os demais candidatos, e a resposta indica quais receberam com sucesso e quais falharam

### Requirement: Token identifica candidato no agendamento
O sistema SHALL validar o token em toda requisição de agendamento (`PATCH /selection-process/interviews/:slotId`). O token determina qual candidato está fazendo o agendamento — sem autenticação adicional.

#### Scenario: Token válido identifica o candidato
- **WHEN** candidato envia token no body do PATCH e o token existe em `psel_interview_tokens` com `expires_at > NOW()`
- **THEN** sistema usa o `candidate_id` associado ao token para verificar e executar o agendamento

#### Scenario: Token expirado é rejeitado
- **WHEN** candidato envia token com `expires_at <= NOW()`
- **THEN** sistema retorna 401 sem revelar se o token existiu ou apenas expirou
