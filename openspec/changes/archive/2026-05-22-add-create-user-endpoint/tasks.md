## 1. Tests (RED Phase)

Escrever todos os testes para `POST /users` em `src/modules/users/users.controller.spec.ts` seguindo o mesmo padrão de integração já existente no arquivo (fetch + orchestrator). Os testes devem ser adicionados como um novo `describe('POST /users', ...)` ao final do arquivo.

- [x] 1.1 Adicionar teste: corpo válido retorna HTTP 201 e o objeto do usuário criado com os campos `id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`
- [x] 1.2 Adicionar teste: `created_at` e `updated_at` retornados são strings ISO 8601 válidas
- [x] 1.3 Adicionar teste: omitir `role` resulta em `role === 'consultor'` na resposta
- [x] 1.4 Adicionar teste: campo obrigatório ausente (`email`, `name`, `sector` ou `cpf`) retorna HTTP 400
- [x] 1.5 Adicionar teste: `email` com formato inválido retorna HTTP 400
- [x] 1.6 Adicionar teste: `role` fora dos valores permitidos retorna HTTP 400
- [x] 1.7 Adicionar teste: `sector` fora dos valores permitidos retorna HTTP 400
- [x] 1.8 Adicionar teste: `cpf` em formato inválido retorna HTTP 400
- [x] 1.9 Adicionar teste: `email` duplicado retorna HTTP 409
- [x] 1.10 Adicionar teste: `cpf` duplicado retorna HTTP 409
- [x] 1.11 Executar `npm test -- --testPathPattern=users.controller` e confirmar que **todos os testes de `POST /users` estão em RED** (falhando) antes de prosseguir

## 2. Zod Schema and Types

- [x] 2.1 Create `src/modules/users/dto/create-user.dto.ts` with a `createUserSchema` Zod object containing `email` (`.email()`), `name` (`.min(1)`), `role` (`.enum([...]).default('consultor')`), `sector` (`.enum([...])`), and `cpf` (`.regex(/^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/)`)
- [x] 2.2 Export the inferred TypeScript type: `export type CreateUserDto = z.infer<typeof createUserSchema>`

## 3. Service Method

- [x] 3.1 Add `create(dto: CreateUserDto): Promise<UserResponse>` method to `UsersService` (import `CreateUserDto` from the dto file)
- [x] 3.2 Use `INSERT INTO users (email, name, role, sector, cpf) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, sector, cpf, created_at, updated_at`
- [x] 3.3 Catch PostgreSQL error code `23505` (unique violation) and throw `ConflictException` with a descriptive message identifying the conflicting field
- [x] 3.4 Map the returned row through the existing `toResponse` helper and return the result

## 4. Controller Route

- [x] 4.1 Add `@Post()` handler to `UsersController` decorated with `@HttpCode(201)`
- [x] 4.2 Parse `@Body()` with `createUserSchema.safeParse(body)` inside the handler; if parsing fails, throw `BadRequestException` passing `result.error.flatten()` as the message
- [x] 4.3 Call `usersService.create(result.data)` and return the result

## 5. GREEN Phase

- [x] 5.1 Executar `npm test -- --testPathPattern=users.controller` e confirmar que **todos os testes de `POST /users` estão passando (GREEN)** sem regressões nos testes existentes de `GET /users` e `GET /users/:user_id`
