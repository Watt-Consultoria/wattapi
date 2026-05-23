## Why

A API está completamente aberta — qualquer cliente pode acessar qualquer endpoint sem identificação. Para suportar um sistema de autorização baseado em role e sector, é necessário primeiro estabelecer a identidade do requisitante. O frontend já utiliza Supabase Auth com OAuth para autenticar usuários; o backend precisa verificar esses tokens e conectar a identidade ao registro em `public.users`.

## What Changes

- Adicionar `AuthModule` com `JwtGuard` que verifica JWTs emitidos pelo Supabase Auth localmente (sem chamada de rede)
- Expor o decorator `@CurrentUser()` para que qualquer controller possa acessar os dados do usuário autenticado (incluindo `role` e `sector`)
- Adicionar endpoint `GET /auth/me` como rota de referência protegida pelo guard
- Adicionar `SUPABASE_JWT_SECRET` ao `EnvService`

## Capabilities

### New Capabilities

- `jwt-verification`: Verificação local de JWTs do Supabase usando `SUPABASE_JWT_SECRET`; retorna 401 se o token for inválido, expirado ou ausente
- `user-identity`: Resolução do usuário autenticado via email extraído do JWT; retorna 401 se não houver registro correspondente em `public.users` ou se o usuário estiver inativo

### Modified Capabilities

<!-- Nenhuma spec existente muda de requisito -->

## Out of Scope

- Proteção das rotas existentes de `/users` (CRUD) — fica para o change de autorização
- Sistema de roles/sectors (`RolesGuard`, `@Roles()`) — fica para o change de autorização
- Criação automática de usuário em `public.users` quando não encontrado (comportamento é 401)

## Impact

- `src/modules/auth/` — novo módulo com `auth.module.ts`, `auth.service.ts`, `jwt.guard.ts`, `auth.controller.ts`, `decorators/current-user.decorator.ts`
- `src/modules/auth/auth.controller.spec.ts` — testes de integração do guard e do endpoint `GET /auth/me`
- `src/config/env.service.ts` — adicionar `SUPABASE_JWT_SECRET` às variáveis validadas
- `src/app.module.ts` — registrar `AuthModule`
- `.env` / `.env.example` — nova variável `SUPABASE_JWT_SECRET`
