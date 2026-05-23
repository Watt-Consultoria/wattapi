## Why

A API possui autenticação via JWT mas nenhuma camada de autorização — qualquer usuário autenticado pode editar ou deletar qualquer outro usuário. É necessário implementar um sistema de autorização baseado em roles e ownership antes que a API seja exposta em produção.

## What Changes

- Introdução de um decorator unificado `@RoutePolicy` que define, por rota, as políticas de acesso, escrita e serialização de saída
- Introdução de um `RoutePolicyGuard` que lê a slice `access` do decorator e nega requisições não autorizadas; resolve também a slice `write` e injeta `req.policy` no request
- Introdução de um `RoleSerializerInterceptor` que lê a slice `output` do decorator e filtra campos da resposta com base no role do caller
- Proteção das rotas `PATCH /users/:id` e `DELETE /users/:id` com regras de acesso baseadas em hierarquia de roles
- Restrição do `POST /users` para permitir apenas a criação do próprio usuário (email do body === email do caller)
- Filtro de saída do campo `cpf` em todas as rotas de usuários, visível apenas para roles de rank >= 2 (diretor, assessor, presidente), com bypass de self em rotas de recurso singular

## Capabilities

### New Capabilities

- `route-policy`: Decorator `@RoutePolicy`, guard `RoutePolicyGuard` e interceptor `RoleSerializerInterceptor` que formam o sistema de autorização e serialização baseado em role
- `role-hierarchy`: Mapeamento ordinal de roles (`presidente=4`, `assessor=3`, `diretor=2`, `gerente=1`, `consultor=0`) e lógica de comparação de rank

### Modified Capabilities

- `update-user`: Regras de acesso e restrição de campos editáveis por role adicionadas ao PATCH /users/:id
- `deactivate-user`: Regras de acesso adicionadas ao DELETE /users/:id (apenas superuser, sem self-delete)
- `create-user`: Restrição de POST /users para criação apenas do próprio usuário

## Impact

- `src/modules/users/users.controller.ts` — adição de `@RoutePolicy` em todas as rotas
- `src/modules/auth/` — novos arquivos: `route-policy.decorator.ts`, `route-policy.guard.ts`, `role-serializer.interceptor.ts`
- `src/modules/auth/auth.module.ts` — registro do guard e interceptor
- Sem mudanças de schema de banco de dados
- Sem breaking changes na interface pública das rotas (campos são filtrados, não removidos do schema)
