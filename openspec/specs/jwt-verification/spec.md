## Capability

`jwt-verification` — Verificação local de JWTs emitidos pelo Supabase Auth.

## Requirements

- O guard deve extrair o token do header `Authorization: Bearer <token>`
- Se o header estiver ausente ou não começar com `Bearer `, retornar HTTP 401
- Se o token for inválido (assinatura incorreta) retornar HTTP 401
- Se o token estiver expirado retornar HTTP 401
- O token deve ser verificado com `SUPABASE_JWT_SECRET` usando o algoritmo HS256
- A verificação deve ser local — sem chamada de rede para o Supabase

## Behavior

| Situação | HTTP |
|---|---|
| Header `Authorization` ausente | 401 |
| Header presente mas sem `Bearer ` | 401 |
| Token com assinatura inválida | 401 |
| Token expirado | 401 |
| Token válido + usuário encontrado | 2xx (passa para o handler) |
