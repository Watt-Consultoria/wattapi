## Why

O Supabase passou a assinar tokens de sessão com ECDSA P-256 (algoritmo ES256) em vez de HS256 (HMAC compartilhado). O backend precisa verificar tokens via JWKS (JSON Web Key Set) remoto, eliminando a dependência de um secret simétrico compartilhado para tokens gerados pelo Supabase.

## What Changes

- O `JwtGuard` agora detecta o algoritmo do token (`ES256` vs `HS256`) no header JWT e roteia para o verificador correto.
- Tokens ES256 (emitidos pelo Supabase) são verificados via `createRemoteJWKSet` do `jose`, buscando as chaves públicas do endpoint `/auth/v1/.well-known/jwks.json`.
- Tokens HS256 (emitidos internamente) continuam sendo verificados via `JwtService.verify()` com o `JWT_SECRET` local.
- A inicialização do JWKS ocorre no `onModuleInit`, evitando fetch na primeira requisição.
- **BREAKING**: A variável de ambiente `JWT_SECRET` não é mais usada para verificar tokens do Supabase — ela se aplica apenas a tokens emitidos pela própria API.

## Capabilities

### New Capabilities

_(nenhuma nova capability — é uma modificação da verificação existente)_

### Modified Capabilities

- `jwt-verification`: Os requisitos de verificação passam a incluir suporte explícito a ES256 via JWKS remoto, com fallback para HS256 em tokens internos.

## Impact

- **Arquivo modificado:** `src/common/guards/jwt.guard.ts`
- **Dependência:** `jose ^4.15.9` (já presente) — fornece `createRemoteJWKSet` e `jwtVerify`
- **Env vars:** `SUPABASE_URL` passa a ser obrigatória em tempo de inicialização (já era required no schema)
- **Sem mudança de contrato HTTP:** os endpoints, status codes e campos de resposta permanecem idênticos
