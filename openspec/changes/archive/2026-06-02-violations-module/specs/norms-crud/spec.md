## ADDED Requirements

### Requirement: Modelo de dados de normas
A tabela `company_norms` SHALL armazenar as normas do estatuto com os campos: `id` (UUID, PK), `code` (TEXT, UNIQUE, NOT NULL — ex: `AN01`), `description` (TEXT, NOT NULL), `severity` (enum: `leve` | `moderada` | `grave` | `desligamento`, NOT NULL), `created_at` (TIMESTAMPTZ, DEFAULT now()), `updated_at` (TIMESTAMPTZ, DEFAULT now()). Não há campo de status ativo/inativo — normas são permanentes ou removidas. As 31 normas iniciais (AN01–AN31) SHALL ser seedadas via migration SQL.

#### Scenario: Estrutura da tabela
- **WHEN** a migration `create-company-norms-table.sql` é aplicada
- **THEN** a tabela `company_norms` existe com as colunas `id`, `code`, `description`, `severity`, `created_at`, `updated_at` e constraint `UNIQUE` no campo `code`

#### Scenario: Seed das 31 normas iniciais
- **WHEN** a migration `seed-company-norms.sql` é aplicada
- **THEN** existem exatamente 31 linhas em `company_norms` com codes AN01 a AN31 e severidades correspondentes ao estatuto

### Requirement: Listar normas
`GET /norms` SHALL retornar todas as normas da tabela, ordenadas por `code` ASC. Qualquer usuário autenticado pode acessar.

#### Scenario: Retorna todas as normas
- **WHEN** um usuário autenticado chama `GET /norms`
- **THEN** o sistema retorna a lista completa de normas ordenadas por `code`

#### Scenario: Request não autenticado é rejeitado
- **WHEN** `GET /norms` é chamado sem JWT válido
- **THEN** o sistema retorna 401 Unauthorized

### Requirement: Criar norma
`POST /norms` SHALL permitir que usuários com rank >= 3 (assessor, presidente) criem novas normas. Body: `code` (obrigatório), `description` (obrigatório), `severity` (obrigatório). Retorna a norma criada com status 201.

#### Scenario: Superuser cria norma com sucesso
- **WHEN** um usuário com rank >= 3 chama `POST /norms` com body válido
- **THEN** a norma é inserida e o sistema retorna 201 com a norma criada

#### Scenario: Code duplicado é rejeitado
- **WHEN** `POST /norms` é chamado com um `code` que já existe
- **THEN** o sistema retorna 409 Conflict

#### Scenario: Usuário de rank insuficiente é rejeitado
- **WHEN** um usuário com rank < 3 chama `POST /norms`
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: Body inválido é rejeitado
- **WHEN** `POST /norms` é chamado sem `code`, `description` ou `severity`
- **THEN** o sistema retorna 400 Bad Request

### Requirement: Editar norma
`PUT /norms/:id` SHALL permitir que usuários com rank >= 3 editem `description` e/ou `severity` de uma norma existente. O campo `code` não pode ser alterado. Retorna a norma atualizada.

#### Scenario: Superuser edita descrição de norma
- **WHEN** um usuário com rank >= 3 chama `PUT /norms/:id` com novo `description`
- **THEN** a norma é atualizada, `updated_at` é renovado e o sistema retorna a norma atualizada

#### Scenario: Edição de code é ignorada
- **WHEN** `PUT /norms/:id` inclui o campo `code` no body
- **THEN** o sistema ignora o campo `code` e não o altera

#### Scenario: Norma não encontrada retorna 404
- **WHEN** `PUT /norms/:id` é chamado com ID inexistente
- **THEN** o sistema retorna 404 Not Found

#### Scenario: Usuário de rank insuficiente é rejeitado
- **WHEN** um usuário com rank < 3 chama `PUT /norms/:id`
- **THEN** o sistema retorna 403 Forbidden

### Requirement: Deletar norma
`DELETE /norms/:id` SHALL realizar hard delete da norma. Se existirem violations referenciando a norma (via FK `norm_id`), a operação SHALL ser rejeitada com 409. Apenas usuários com rank >= 3 podem deletar.

#### Scenario: Superuser deleta norma sem violations
- **WHEN** um usuário com rank >= 3 chama `DELETE /norms/:id` para uma norma sem violations associadas
- **THEN** a norma é removida permanentemente e o sistema retorna 204 No Content

#### Scenario: Norma com violations associadas não pode ser deletada
- **WHEN** `DELETE /norms/:id` é chamado e existem violations referenciando essa norma
- **THEN** o sistema retorna 409 Conflict

#### Scenario: Norma não encontrada retorna 404
- **WHEN** `DELETE /norms/:id` é chamado com ID inexistente
- **THEN** o sistema retorna 404 Not Found

#### Scenario: Usuário de rank insuficiente é rejeitado
- **WHEN** um usuário com rank < 3 chama `DELETE /norms/:id`
- **THEN** o sistema retorna 403 Forbidden
