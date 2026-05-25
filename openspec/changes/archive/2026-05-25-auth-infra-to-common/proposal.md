## Why

O diretório `/modules/auth/` acumula tanto o recurso de domínio (`GET /auth/me`, `AuthService`) quanto infraestrutura de segurança transversal (`JwtGuard`, `RoutePolicyGuard`, `RoleSerializerInterceptor`, decorators). À medida que a API cresce, novos módulos precisarão importar essa infraestrutura — e fazê-la viver dentro de um "módulo de domínio" cria uma dependência conceitual incorreta.

## What Changes

- Criação do diretório `src/common/` com subpastas `guards/`, `interceptors/` e `decorators/`
- Movimentação dos seguintes arquivos de `src/modules/auth/` para `src/common/`:
  - `jwt.guard.ts` + `jwt.guard.spec.ts` → `common/guards/`
  - `route-policy.guard.ts` + `route-policy.guard.spec.ts` → `common/guards/`
  - `role-serializer.interceptor.ts` + `role-serializer.interceptor.spec.ts` → `common/interceptors/`
  - `role-hierarchy.ts` → `common/guards/`
  - `decorators/current-user.decorator.ts` → `common/decorators/`
  - `decorators/route-policy.decorator.ts` → `common/decorators/`
- Atualização de todos os imports afetados
- `AuthModule` passa a exportar os providers vindos de `common/` (sem quebrar módulos que o importam)
- Nenhuma mudança de comportamento — é refactoring puro

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

_Nenhuma — apenas reorganização de arquivos, sem alteração de requisitos ou comportamento._

## Impact

- `src/modules/auth/` — remove guards, interceptors, decorators e role-hierarchy
- `src/common/` — novo diretório criado com toda a infraestrutura de segurança
- `src/modules/users/users.controller.ts` — imports atualizados
- `src/modules/auth/auth.module.ts` — imports e exports atualizados
- Nenhuma API pública alterada, nenhum contrato de interface alterado
