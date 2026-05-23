## 1. Tests (RED Phase)

Escrever todos os testes para `PATCH /users/:id` e `DELETE /users/:id` em `src/modules/users/users.controller.spec.ts`, adicionando dois novos blocos `describe` ao final do arquivo. Seguir o padrão de integração já existente (fetch + orchestrator).

- [x] 1.1 `PATCH /users/:id` — teste: atualização de um campo retorna HTTP 200 e o usuário com o campo alterado
- [x] 1.2 `PATCH /users/:id` — teste: apenas os campos fornecidos são alterados; os demais permanecem inalterados
- [x] 1.3 `PATCH /users/:id` — teste: `updated_at` retornado é >= ao `updated_at` anterior à atualização
- [x] 1.4 `PATCH /users/:id` — teste: body `{}` (vazio) retorna HTTP 400
- [x] 1.5 `PATCH /users/:id` — teste: `email` inválido retorna HTTP 400
- [x] 1.6 `PATCH /users/:id` — teste: `role` inválido retorna HTTP 400
- [x] 1.7 `PATCH /users/:id` — teste: `sector` inválido retorna HTTP 400
- [x] 1.8 `PATCH /users/:id` — teste: `cpf` em formato inválido retorna HTTP 400
- [x] 1.9 `PATCH /users/:id` — teste: id inexistente retorna HTTP 404
- [x] 1.10 `PATCH /users/:id` — teste: `email` duplicado (de outro usuário) retorna HTTP 409
- [x] 1.11 `PATCH /users/:id` — teste: `cpf` duplicado (de outro usuário) retorna HTTP 409
- [x] 1.12 `DELETE /users/:id` — teste: id existente retorna HTTP 204 sem body
- [x] 1.13 `DELETE /users/:id` — teste: após DELETE, `GET /users/:id` retorna HTTP 404 (usuário inativo invisível via API)
- [x] 1.14 `DELETE /users/:id` — teste: id inexistente retorna HTTP 404
- [x] 1.15 `DELETE /users/:id` — teste: usuário deletado não é mais listado em `GET /users` e `GET /users/id`
- [x] 1.16 Executar `npm test -- --testPathPattern=users.controller` e confirmar que **todos os novos testes estão em RED** antes de prosseguir

## 2. Migration

- [x] 2.1 Criar `src/database/supabase/migrations/<timestamp>_add-inactive-to-users.sql` com `ALTER TABLE users ADD COLUMN IF NOT EXISTS inactive boolean not null default false;`
- [x] 2.2 Aplicar a migration no banco local: `supabase db push --workdir ./src/database`

## 3. Zod Schema

- [x] 3.1 Adicionar `updateUserSchema` em `src/modules/users/dto/create-user.dto.ts` usando `createUserSchema.omit({ role: true }).partial().merge(z.object({ role: z.enum([...]).optional() }))` — ou simplesmente `createUserSchema.partial()` — e exportar o tipo `UpdateUserDto = z.infer<typeof updateUserSchema>`

## 3. Service Methods

- [x] 4.1 Adicionar `update(id: string, dto: UpdateUserDto): Promise<UserResponse>` em `UsersService`:
  - Montar o SET dinâmico somente com os campos presentes em `dto`
  - Incluir `updated_at = now()` no SET
  - Usar `WHERE id = $1 RETURNING ...`
  - Lançar `NotFoundException` se `rowCount === 0`
  - Lançar `ConflictException` para erro PG `23505`
- [x] 4.2 Adicionar `deactivate(id: string): Promise<void>` em `UsersService`:
  - Executar `UPDATE users SET inactive = true, updated_at = now() WHERE id = $1`
  - Lançar `NotFoundException` se `rowCount === 0`

## 5. Controller Routes

- [x] 5.1 Adicionar `@Patch(':user_id')` em `UsersController`: parsear body com `updateUserSchema.safeParse()`, rejeitar com 400 se falhar ou se `Object.keys(result.data).length === 0`, chamar `usersService.update(userId, result.data)` e retornar o resultado (HTTP 200 por padrão)
- [x] 5.2 Adicionar `@Delete(':user_id')` em `UsersController` decorado com `@HttpCode(204)`: chamar `usersService.deactivate(userId)` e não retornar body
- [x] 5.3 Garantir que usuários com `inactive=true` sejam filtrados: adicionar `WHERE inactive = false` em `findAll()` e lançar `NotFoundException` em `findOne()` quando o usuário estiver inativo

## 6. GREEN Phase

- [x] 6.1 Executar `npm test -- --testPathPattern=users.controller` e confirmar que **todos os testes passam (GREEN)** sem regressões nos testes de `GET`, `POST` já existentes
