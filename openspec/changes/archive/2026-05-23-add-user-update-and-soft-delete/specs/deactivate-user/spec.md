## ADDED Requirements

### Requirement: Desativar um usuário via DELETE /users/:id (soft delete)
O sistema SHALL expor `DELETE /users/:id` que, em vez de excluir o registro, define `inactive = true` no usuário e retorna HTTP 204 sem body.

#### Scenario: Desativação bem-sucedida
- **WHEN** um cliente envia `DELETE /users/:id` com um id existente
- **THEN** o sistema SHALL definir `inactive = true` para esse usuário e retornar HTTP 204 sem body

#### Scenario: Registro permanece na base após DELETE
- **WHEN** um cliente envia `DELETE /users/:id` com sucesso
- **THEN** o usuário SHALL ainda ser encontrado via `GET /users/:id` (não foi removido fisicamente da base)

### Requirement: Rejeitar DELETE para usuário inexistente
O sistema SHALL retornar 404 quando o `id` não corresponder a nenhum usuário.

#### Scenario: id não encontrado
- **WHEN** um cliente envia `DELETE /users/:id` com um id que não existe na base
- **THEN** o sistema SHALL retornar HTTP 404
