## Capability

`user-identity` — Resolução do usuário autenticado a partir do JWT para o registro em `public.users`.

## Requirements

- Após verificação bem-sucedida do JWT, o guard deve buscar o usuário pelo `email` contido no payload
- A busca deve filtrar `inactive = false` — usuários desativados são tratados como inexistentes
- Se não houver registro correspondente em `public.users`, retornar HTTP 401
- Se o usuário for encontrado, seus dados completos (`id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`) devem estar disponíveis em `request.user`
- O decorator `@CurrentUser()` deve extrair `request.user` com tipagem `UserResponse`

## Behavior

| Situação | HTTP |
|---|---|
| Email do JWT não tem registro em `public.users` | 401 |
| Email encontrado mas usuário está inativo (`inactive = true`) | 401 |
| Email encontrado e usuário ativo | 2xx, `req.user` populado |

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
