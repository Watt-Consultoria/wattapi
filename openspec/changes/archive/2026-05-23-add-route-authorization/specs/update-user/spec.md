## MODIFIED Requirements

### Requirement: Atualizar parcialmente um usuário via PATCH /users/:id
O sistema SHALL expor `PATCH /users/:id` que aceita um body JSON com um subconjunto dos campos editáveis, atualiza apenas os campos fornecidos e retorna o usuário completo atualizado com HTTP 200.

Os campos editáveis variam conforme o role do caller:
- Superusuário (rank >= 3): pode editar `email`, `name`, `role`, `sector`, `cpf` de qualquer usuário cujo rank seja menor que o seu
- Usuário regular (rank < 3): pode editar apenas `name` e `cpf` do próprio perfil (`caller.id === :id`)

#### Scenario: Atualização bem-sucedida de um campo
- **WHEN** um cliente autorizado envia `PATCH /users/:id` com um body JSON válido contendo ao menos um campo editável para seu nível de acesso
- **THEN** o sistema SHALL atualizar apenas os campos presentes no body, preservar os demais, e retornar HTTP 200 com o objeto completo do usuário (`id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`)

#### Scenario: updated_at é atualizado após PATCH
- **WHEN** um cliente envia `PATCH /users/:id` com uma alteração válida
- **THEN** o campo `updated_at` do usuário retornado SHALL ser maior ou igual ao `updated_at` anterior

#### Scenario: Usuário regular não pode editar outro usuário
- **WHEN** caller tem rank < 3 e `caller.id !== :id`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Superusuário não pode editar usuário de rank igual ou superior
- **WHEN** caller é assessor (rank 3) e target é presidente (rank 4)
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário regular não pode alterar campos restritos
- **WHEN** caller tem rank < 3, `caller.id === :id`, e o body contém `role` ou `sector`
- **THEN** o sistema SHALL retornar HTTP 403

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
