## Why

A API já permite criar e consultar usuários, mas não há como atualizar dados nem desativar uma conta. Adicionar `PATCH /users/:id` e `DELETE /users/:id` (soft delete) completa o ciclo de gestão de usuários sem perda de dados históricos.

## What Changes

- Adicionar `PATCH /users/:id` que aceita um subconjunto dos campos do usuário (`email`, `name`, `role`, `sector`, `cpf`) e atualiza apenas os fornecidos
- Adicionar `DELETE /users/:id` que **não exclui** o registro — apenas marca o campo `inactive` como `true`

## Capabilities

### New Capabilities

- `update-user`: Atualização parcial (PATCH) dos campos editáveis de um usuário pelo id
- `deactivate-user`: Desativação lógica (soft delete) de um usuário via DELETE, sem remoção do banco

### Modified Capabilities

<!-- Nenhuma spec existente muda de requisito -->

## Impact

- `src/modules/users/users.service.ts` — métodos `update()` e `deactivate()`
- `src/modules/users/users.controller.ts` — handlers `@Patch(':user_id')` e `@Delete(':user_id')`
- `src/modules/users/dto/` — novo schema Zod `updateUserSchema` com todos os campos opcionais
- `src/modules/users/users.controller.spec.ts` — testes de integração para os dois novos endpoints
