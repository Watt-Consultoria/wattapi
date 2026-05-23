## MODIFIED Requirements

### Requirement: Desativar um usuário via DELETE /users/:id (soft delete)
O sistema SHALL expor `DELETE /users/:id` que, em vez de excluir o registro, define `inactive = true` no usuário e retorna HTTP 204 sem body.

Apenas superusuários (rank >= 3) podem chamar este endpoint. Self-delete não é permitido: um caller não pode desativar o próprio usuário. Um assessor não pode desativar o presidente (regra de hierarquia: `rank(caller) > rank(target)`).

#### Scenario: Desativação bem-sucedida por superusuário
- **WHEN** um superusuário (rank >= 3) envia `DELETE /users/:id` com id de um usuário de rank inferior
- **THEN** o sistema SHALL definir `inactive = true` para esse usuário e retornar HTTP 204 sem body

#### Scenario: Registro permanece na base após DELETE
- **WHEN** um superusuário envia `DELETE /users/:id` com sucesso
- **THEN** o usuário SHALL ainda existir na base de dados com `inactive = true`

#### Scenario: Usuário regular não pode deletar
- **WHEN** caller tem rank < 3 e envia `DELETE /users/:id`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Self-delete não é permitido
- **WHEN** caller envia `DELETE /users/:id` onde `:id === caller.id`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Assessor não pode deletar presidente
- **WHEN** caller é assessor (rank 3) e target é presidente (rank 4)
- **THEN** o sistema SHALL retornar HTTP 403

### Requirement: Rejeitar DELETE para usuário inexistente
O sistema SHALL retornar 404 quando o `id` não corresponder a nenhum usuário.

#### Scenario: id não encontrado
- **WHEN** um superusuário envia `DELETE /users/:id` com um id que não existe na base
- **THEN** o sistema SHALL retornar HTTP 404
