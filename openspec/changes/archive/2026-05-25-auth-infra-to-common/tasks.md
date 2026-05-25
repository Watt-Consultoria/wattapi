## 1. Criar estrutura de pastas

- [x] 1.1 Criar `src/common/guards/`
- [x] 1.2 Criar `src/common/interceptors/`
- [x] 1.3 Criar `src/common/decorators/`

## 2. Mover arquivos

- [x] 2.1 Mover `jwt.guard.ts` e `jwt.guard.spec.ts` → `src/common/guards/`
- [x] 2.2 Mover `route-policy.guard.ts` e `route-policy.guard.spec.ts` → `src/common/guards/`
- [x] 2.3 Mover `role-serializer.interceptor.ts` e `role-serializer.interceptor.spec.ts` → `src/common/interceptors/`
- [x] 2.4 Mover `role-hierarchy.ts` → `src/common/guards/`
- [x] 2.5 Mover `decorators/current-user.decorator.ts` → `src/common/decorators/`
- [x] 2.6 Mover `decorators/route-policy.decorator.ts` → `src/common/decorators/`

## 3. Atualizar imports

- [x] 3.1 Atualizar imports internos em `jwt.guard.ts` (referência a `auth.service.ts` e `users.service.ts`)
- [x] 3.2 Atualizar imports internos em `route-policy.guard.ts` (referência a `role-hierarchy.ts`, `jwt.guard.ts`, `route-policy.decorator.ts`)
- [x] 3.3 Atualizar imports internos em `role-serializer.interceptor.ts` (referência a `role-hierarchy.ts`, `route-policy.decorator.ts`)
- [x] 3.4 Atualizar imports em `current-user.decorator.ts`
- [x] 3.5 Atualizar `auth.module.ts` — novos caminhos para todos os providers e exports movidos
- [x] 3.6 Atualizar `auth.controller.ts` — imports de decorators e guards
- [x] 3.7 Atualizar `auth.service.ts` — verificar se há imports afetados
- [x] 3.8 Atualizar `users.controller.ts` — imports de guards, interceptors e decorators
- [x] 3.9 Atualizar specs dos testes (`jwt.guard.spec.ts`, `route-policy.guard.spec.ts`, `role-serializer.interceptor.spec.ts`)

## 4. Verificação

- [x] 4.1 Verificar que não restam imports apontando para os caminhos antigos em `modules/auth/`
- [x] 4.2 Rodar `npm run lint` sem erros
- [x] 4.3 Rodar `npm test` — todos os testes devem passar
