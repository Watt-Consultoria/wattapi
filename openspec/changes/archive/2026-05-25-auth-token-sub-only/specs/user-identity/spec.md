## MODIFIED Requirements

### Requirement: Resolução do usuário autenticado por ID

Após verificação bem-sucedida do JWT, o guard deve buscar o usuário pelo `sub` (UUID) contido no payload do token, consultando `public.users WHERE id = $1`. O email e demais dados do usuário são sempre obtidos do banco, nunca do token.

A busca SHALL filtrar `inactive = false` — usuários desativados são tratados como inexistentes.

Se não houver registro correspondente em `public.users`, o guard SHALL setar `jwtStatus = 'user-not-found'`.

Se o usuário for encontrado, seus dados completos (`id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`) devem estar disponíveis em `request.user` e o decorator `@CurrentUser()` deve extrair `request.user` com tipagem `UserResponse`.

#### Scenario: ID do JWT não tem registro em public.users

- **WHEN** o `sub` do token não corresponde a nenhum registro ativo em `public.users`
- **THEN** o guard SHALL setar `request.jwtStatus = 'user-not-found'` e popular `request.jwtData = { sub }` sem popular `request.user`

#### Scenario: Usuário encontrado mas inativo

- **WHEN** o `sub` do token corresponde a um registro em `public.users` com `inactive = true`
- **THEN** o guard SHALL setar `request.jwtStatus = 'user-not-found'` e popular `request.jwtData = { sub }` sem popular `request.user`

#### Scenario: Usuário encontrado e ativo

- **WHEN** o `sub` do token corresponde a um registro ativo em `public.users`
- **THEN** o guard SHALL setar `request.jwtStatus = 'ok'`, popular `request.jwtData = { sub }` e popular `request.user` com o `UserResponse` completo

## Behavior

| Situação                                                      | jwtStatus                 |
| ------------------------------------------------------------- | ------------------------- |
| `sub` do JWT não tem registro em `public.users`               | `user-not-found`          |
| `sub` encontrado mas usuário está inativo (`inactive = true`) | `user-not-found`          |
| `sub` encontrado e usuário ativo                              | `ok`, `req.user` populado |

## `GET /auth/me`

Rota de referência protegida pelo `JwtGuard`. Retorna o objeto `UserResponse` do usuário autenticado.

```
GET /auth/me
Authorization: Bearer <token>

200 OK
{
  "id": "uuid",
  "email": "user@watt.com",
  "name": "...",
  "role": "gerente",
  "sector": "comercial",
  "cpf": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

