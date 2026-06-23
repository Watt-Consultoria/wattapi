## ADDED Requirements

### Requirement: Usuário autenticado declara disponibilidade em slots de entrevista
O sistema SHALL permitir que qualquer usuário autenticado (independente de role) declare disponibilidade para conduzir entrevistas. Cada slot dura exatamente 1 hora em horário fechado de Brasília (08h–19h BRT = UTC-3). O `ends_at` é computado pelo servidor como `starts_at + 1 hora`. Slots são associados automaticamente ao processo seletivo ativo no momento da criação. O `consultant_id` é extraído do token JWT do usuário autenticado — não enviado pelo cliente.

#### Scenario: Criação em lote com horários válidos
- **WHEN** usuário autenticado faz `POST /selection-process/interviews` com `{ "slots": ["2026-07-10T11:00:00Z", "2026-07-10T14:00:00Z"] }` e existe processo ativo
- **THEN** sistema cria os slots associados ao processo ativo com `consultant_id` do usuário autenticado, `ends_at` = `starts_at + 1h`, retorna array com os slots criados com status 201

#### Scenario: Dois consultores diferentes criam slots no mesmo horário
- **WHEN** consultor A e consultor B criam slots com o mesmo `starts_at`
- **THEN** ambos os slots são criados com sucesso — entrevistas paralelas são suportadas

#### Scenario: Rejeição quando não existe processo ativo
- **WHEN** usuário faz `POST /selection-process/interviews` e nenhum processo seletivo está ativo
- **THEN** sistema retorna 404 com mensagem "No active selection process found"

#### Scenario: Rejeição de horário fora do intervalo BRT permitido
- **WHEN** usuário envia `starts_at` cuja hora BRT (UTC-3) é 20h ou superior (ex: `"2026-07-10T23:00:00Z"` = 20h BRT)
- **THEN** sistema retorna 400 indicando que o horário deve ser entre 08h e 19h BRT

#### Scenario: Rejeição de horário não fechado
- **WHEN** usuário envia `starts_at` com minutos diferentes de 0 (ex: `"2026-07-10T11:30:00Z"`)
- **THEN** sistema retorna 400 indicando que os slots devem ser em horas fechadas

#### Scenario: Rejeição de horário no passado
- **WHEN** usuário envia `starts_at` anterior ao momento atual
- **THEN** sistema retorna 400 indicando que o horário deve ser no futuro

#### Scenario: Slot duplicado para o mesmo consultor ignorado no lote
- **WHEN** usuário envia um `starts_at` que já existe para o mesmo `consultant_id`
- **THEN** sistema ignora o slot duplicado via `ON CONFLICT DO NOTHING` e retorna apenas os slots efetivamente criados

#### Scenario: Rejeição sem autenticação
- **WHEN** requisição não inclui token JWT
- **THEN** sistema retorna 401

### Requirement: Candidato lista horários disponíveis para entrevista
O sistema SHALL retornar os horários de entrevista disponíveis, agregados por `starts_at`. Um horário é considerado disponível quando há ao menos 2 slots sem booking naquele momento (`booking_id IS NULL`). A resposta não expõe nomes ou IDs de consultores. A rota é pública (sem autenticação).

#### Scenario: Listagem de horários com pelo menos 2 consultores livres
- **WHEN** qualquer cliente faz `GET /selection-process/interviews`
- **THEN** sistema retorna array de objetos `{ starts_at, ends_at }` para cada horário onde `COUNT(slots com booking_id IS NULL) >= 2`, ordenados por `starts_at ASC`

#### Scenario: Horário com apenas 1 consultor livre não aparece
- **WHEN** em um determinado horário apenas 1 slot tem `booking_id IS NULL`
- **THEN** esse horário não é incluído na resposta

#### Scenario: Horário com 3+ consultores livres aparece normalmente
- **WHEN** em um determinado horário 3 ou mais slots têm `booking_id IS NULL`
- **THEN** esse horário é incluído na resposta como disponível

#### Scenario: Lista vazia quando não há horários disponíveis
- **WHEN** todos os slots têm `booking_id` preenchido ou não existem slots
- **THEN** sistema retorna array vazio `[]`

#### Scenario: Lista vazia quando não há processo ativo
- **WHEN** nenhum processo seletivo está ativo
- **THEN** sistema retorna array vazio `[]`

### Requirement: Candidato agenda entrevista via token e horário desejado
O sistema SHALL permitir que um candidato agende sua entrevista fornecendo um token válido e o horário desejado. O sistema sorteia aleatoriamente 2 consultores entre os disponíveis naquele horário e cria o booking atomicamente. Um candidato só pode ter uma entrevista agendada.

#### Scenario: Agendamento bem-sucedido
- **WHEN** candidato faz `PATCH /selection-process/interviews` com `{ "starts_at": "...", "token": "<valid>" }`, o token é válido, o candidato ainda não tem booking, e o horário tem pelo menos 2 slots livres
- **THEN** sistema sorteia 2 consultores dentre os disponíveis, cria registro em `psel_interview_bookings`, marca os 2 slots sorteados com `booking_id`, envia email de confirmação ao candidato, retorna dados do booking com status 200

#### Scenario: Seleção aleatória quando há mais de 2 consultores disponíveis
- **WHEN** horário tem 3 ou mais slots livres e candidato agenda
- **THEN** sistema seleciona exatamente 2 consultores aleatoriamente; os demais slots permanecem com `booking_id IS NULL`

#### Scenario: Rejeição por token inválido ou expirado
- **WHEN** candidato envia token inexistente ou com `expires_at <= NOW()`
- **THEN** sistema retorna 401

#### Scenario: Rejeição quando candidato já tem entrevista agendada
- **WHEN** candidato com booking existente tenta agendar novamente
- **THEN** sistema retorna 409 com mensagem "Candidate already has an interview scheduled"

#### Scenario: Rejeição quando horário tem menos de 2 consultores livres
- **WHEN** candidato solicita horário onde `COUNT(slots com booking_id IS NULL) < 2`
- **THEN** sistema retorna 409 com mensagem "Slot is no longer available"

#### Scenario: Race condition — dois candidatos tentam o mesmo horário com exatamente 2 slots livres
- **WHEN** duas requisições concorrentes tentam agendar o mesmo horário com apenas 2 slots disponíveis
- **THEN** exatamente uma das requisições é bem-sucedida; a outra recebe 409

### Requirement: Usuário autenticado visualiza seus próprios slots
O sistema SHALL permitir que qualquer usuário autenticado visualize os slots que declarou. Se o slot estiver vinculado a um booking, a resposta inclui dados do candidato (nome e email). Assessor e presidente visualizam slots de todos os consultores.

#### Scenario: Consultor vê apenas seus próprios slots
- **WHEN** usuário com role `consultor`, `gerente` ou `diretor` faz `GET /selection-process/interviews/my-slots`
- **THEN** sistema retorna apenas slots onde `consultant_id = <userId do token>`, incluindo status de booking e dados do candidato se booked

#### Scenario: Superuser vê todos os slots
- **WHEN** usuário com role `assessor` ou `presidente` faz `GET /selection-process/interviews/my-slots`
- **THEN** sistema retorna todos os slots de todos os consultores, incluindo `consultant_name` em cada slot

#### Scenario: Slot livre retorna sem dados de candidato
- **WHEN** slot tem `booking_id IS NULL`
- **THEN** resposta inclui o slot sem campos de candidato (ou com `candidate_name: null`, `candidate_email: null`)

#### Scenario: Slot booked retorna com dados do candidato
- **WHEN** slot tem `booking_id` preenchido
- **THEN** resposta inclui `candidate_name` e `candidate_email` do candidato agendado

#### Scenario: Rejeição sem autenticação
- **WHEN** requisição não inclui token JWT
- **THEN** sistema retorna 401
