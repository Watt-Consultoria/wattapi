## 1. Infraestrutura base

- [x] 1.1 Criar `src/modules/auth/decorators/route-policy.decorator.ts` com o tipo `RoutePolicyOptions` (slices `access`, `write`, `output`) e o decorator `@RoutePolicy` usando `SetMetadata('route_policy', policy)`
- [x] 1.2 Criar `src/modules/auth/role-hierarchy.ts` com o mapa `ROLE_RANK` e as funções `getRank(role)` e `isSuperuser(role)`

## 2. Testes (RED)

- [x] 2.1 Criar `src/modules/auth/route-policy.guard.spec.ts` com testes para todos os cenários da spec `route-policy`: modo `authenticated`, modo `min-rank` (rank suficiente passa, rank insuficiente bloqueado), `superuser-or-self` (superuser edita inferior, superuser bloqueado para superior, self passa, não-self bloqueado), `superuser-only` (regular bloqueado, self bloqueado com `noSelfAccess`), injeção de `req.policy.writableFields`
- [x] 2.2 Criar `src/modules/auth/role-serializer.interceptor.spec.ts` com testes para: campo restrito removido de lista quando rank insuficiente, campo visível em lista quando rank suficiente, `selfBypass` em recurso singular (próprio objeto), `selfBypass` não aplicado em lista
- [x] 2.3 Confirmar que todos os testes novos falham (RED) antes de prosseguir

## 3. Implementação do RoutePolicyGuard

- [x] 3.1 Criar `src/modules/auth/route-policy.guard.ts`: guard que injeta `Reflector` e `UsersService`, lê `route_policy` via Reflector, extrai `user_id` do param se presente, carrega o usuário-alvo quando necessário, avalia `access.mode` conforme as regras de rank, lança `ForbiddenException` quando não autorizado, injeta `req.policy` com `writableFields` resolvidos para o caller

## 4. Implementação do RoleSerializerInterceptor

- [x] 4.1 Criar `src/modules/auth/role-serializer.interceptor.ts`: interceptor que injeta `Reflector`, lê slice `output` do `@RoutePolicy`, detecta se resposta é array ou objeto singular, aplica `minRank` e `selfBypass` por campo, remove campos não autorizados da resposta sem modificar outros campos

## 5. Registro no módulo

- [x] 5.1 Adicionar `RoutePolicyGuard` e `RoleSerializerInterceptor` como providers e exports em `src/modules/auth/auth.module.ts`
- [x] 5.2 Importar `UsersModule` em `AuthModule` (necessário para o guard carregar o usuário-alvo) — verificar se não cria dependência circular; se sim, extrair `UsersService` para módulo compartilhado ou usar `forwardRef`

## 6. Aplicar políticas nas rotas de users

- [x] 6.1 Aplicar `@UseGuards(JwtGuard, RoutePolicyGuard)` e `@UseInterceptors(RoleSerializerInterceptor)` no `UsersController` (nível de controller)
- [x] 6.2 Adicionar `@RoutePolicy` em `GET /users`: `access: { mode: 'authenticated' }`, `output: { cpf: { minRank: 2, selfBypass: false } }`
- [x] 6.3 Adicionar `@RoutePolicy` em `GET /users/:user_id`: `access: { mode: 'authenticated' }`, `output: { cpf: { minRank: 2, selfBypass: true } }`
- [x] 6.4 Adicionar `@RoutePolicy` em `POST /users`: `access: { mode: 'authenticated' }` — validação de self-email fica no controller (verificar `body.email === caller.email`, lançar `ForbiddenException` se diferente); `output: { cpf: { minRank: 0, selfBypass: false } }` (sempre visível na criação)
- [x] 6.5 Adicionar `@RoutePolicy` em `PATCH /users/:user_id`: `access: { mode: 'superuser-or-self' }`, `write: { superuser: ['email','name','role','sector','cpf'], self: ['name','cpf'] }`, `output: { cpf: { minRank: 2, selfBypass: true } }`; adaptar o controller para construir o schema Zod usando `req.policy.writableFields` via `.pick()`
- [x] 6.6 Adicionar `@RoutePolicy` em `DELETE /users/:user_id`: `access: { mode: 'superuser-only', noSelfAccess: true }`

## 7. Testes de integração

- [x] 7.1 Adicionar cenários em `src/modules/users/users.controller.spec.ts` cobrindo: 403 para usuário regular editando outro, 403 para campos restritos (role/sector) por usuário regular, 403 para self-delete, 403 para assessor tentando deletar presidente, 403 para POST com email diferente do caller, CPF omitido em lista para gerente/consultor, CPF presente em recurso singular para próprio usuário

## 8. Finalização

- [x] 8.1 Verificar que todos os testes passam (`npm run test`)
- [x] 8.2 Verificar que não há erros de ESLint nos arquivos modificados e criados (`npm run lint`)
