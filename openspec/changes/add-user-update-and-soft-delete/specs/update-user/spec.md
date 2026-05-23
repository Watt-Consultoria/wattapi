## ADDED Requirements

### Requirement: Atualizar parcialmente um usuário via PATCH /users/:id
O sistema SHALL expor `PATCH /users/:id` que aceita um body JSON com um subconjunto dos campos editáveis (`email`, `name`, `role`, `sector`, `cpf`), atualiza apenas os campos fornecidos e retorna o usuário completo atualizado com HTTP 200.

#### Scenario: Atualização bem-sucedida de um campo
- **WHEN** um cliente envia `PATCH /users/:id` com um body JSON válido contendo ao menos um campo editável
- **THEN** o sistema SHALL atualizar apenas os campos presentes no body, preservar os demais, e retornar HTTP 200 com o objeto completo do usuário (`id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`)

#### Scenario: updated_at é atualizado após PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com uma alteração válida
- **THEN** o campo `updated_at` do usuário retornado SHALL ser maior ou igual ao `updated_at` anterior

### Requirement: Validar campos do PATCH
O sistema SHALL rejeitar requests com campos inválidos ou body sem nenhum campo editável.

#### Scenario: Body completamente vazio
- **WHEN** um cliente envia `PATCH /users/:id` com body `{}`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: email inválido no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com `email` em formato inválido
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: role inválido no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com `role` fora dos valores permitidos
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: sector inválido no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com `sector` fora dos valores permitidos
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: cpf em formato inválido no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com `cpf` fora do padrão aceito
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Rejeitar PATCH para usuário inexistente
O sistema SHALL retornar 404 quando o `id` não corresponder a nenhum usuário.

#### Scenario: id não encontrado
- **WHEN** um cliente envia `PATCH /users/:id` com um id que não existe na base
- **THEN** o sistema SHALL retornar HTTP 404

### Requirement: Rejeitar PATCH que viola unicidade
O sistema SHALL retornar 409 quando o `email` ou `cpf` fornecido já pertencer a outro usuário.

#### Scenario: email duplicado no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com um `email` já cadastrado em outro usuário
- **THEN** o sistema SHALL retornar HTTP 409

#### Scenario: cpf duplicado no PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com um `cpf` já cadastrado em outro usuário
- **THEN** o sistema SHALL retornar HTTP 409
