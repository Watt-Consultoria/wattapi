## 1. Testes (RED)

- [x] 1.1 Criar/atualizar `src/modules/auth/jwt.guard.spec.ts` cobrindo todos os cenários do novo JwtGuard: `jwtStatus = 'no-token'` sem header; `jwtStatus = 'token-expired'` com token expirado; `jwtStatus = 'token-invalid'` com token malformado; `jwtStatus = 'user-not-found'` com token válido e email inexistente; `jwtStatus = 'ok'` com token válido e usuário encontrado; em todos os casos o guard retorna `true` (nunca rejeita)
- [x] 1.2 Criar/atualizar `src/modules/auth/route-policy.guard.spec.ts` cobrindo: cada `mode` (`unauthenticated`, `unexistent`, `authenticated`); cada condição `rba` (`self`, `['minRank', n]`, `['sector', string]`, `['sector', string[]]`); lógica OR no `rba`; mensagens de erro contextuais por `jwtStatus`; `mode: 'unexistent'` com `jwtStatus = 'ok'` retorna 409; hierarquia de rank em `['minRank', n]` com `params.user_id`
- [x] 1.3 Criar/atualizar `src/modules/users/users.controller.spec.ts` cobrindo: 201 em auto-registro bem-sucedido com `id = sub` e `role = 'consultor'`; 400 para body sem `name`, `sector` ou `cpf`; `role` e `email` ignorados pelo schema do body
- [x] 1.4 Confirmar que todos os testes novos falham (RED) antes de prosseguir

## 2. Atualizar tipos no decorator `@RoutePolicy`

- [x] 2.1 Em `src/modules/auth/decorators/route-policy.decorator.ts`, definir `RbaCondition` como union: `'self' | ['minRank', number] | ['sector', string | string[]]`
- [x] 2.2 Reescrever `AccessPolicy` como discriminated union: `{ mode: 'unauthenticated' } | { mode: 'unexistent' } | { mode: 'authenticated'; rba?: RbaCondition[] }`
- [x] 2.3 Remover `AccessMode`, `minRank` e `noSelfAccess` de `AccessPolicy` — todos obsoletos

## 3. Reescrever JwtGuard

- [x] 3.1 Definir o tipo `JwtStatus = 'no-token' | 'token-expired' | 'token-invalid' | 'user-not-found' | 'ok'` e adicionar `jwtStatus: JwtStatus` na interface da request
- [x] 3.2 Remover toda lógica de rejeição do guard; o método `canActivate` SHALL sempre retornar `true`
- [x] 3.3 Detectar ausência de Authorization header → setar `jwtStatus = 'no-token'` e retornar
- [x] 3.4 Capturar `TokenExpiredError` de `jwtService.verify()` → setar `jwtStatus = 'token-expired'` e retornar
- [x] 3.5 Capturar outros erros de `jwtService.verify()` → setar `jwtStatus = 'token-invalid'` e retornar
- [x] 3.6 Em token válido: popular `request.jwtClaims = { sub, email }`; tentar `authService.resolveUser(email)` via try/catch; se não encontrar → `jwtStatus = 'user-not-found'`; se encontrar → `jwtStatus = 'ok'` e popular `request.user`
- [x] 3.7 Registrar `JwtGuard` como guard global em `src/app.module.ts` via `{ provide: APP_GUARD, useClass: JwtGuard }`; remover `@UseGuards(JwtGuard)` dos controllers

## 4. Reescrever RoutePolicyGuard

- [x] 4.1 Implementar avaliação de `mode`: `unauthenticated` (sempre passa), `unexistent` (requer jwtClaims, rejeita se user existe), `authenticated` (requer request.user)
- [x] 4.2 Implementar mensagens de erro contextuais por `jwtStatus` antes de avaliar `mode`: `'no-token'` → 401, `'token-expired'` → 401, `'token-invalid'` → 401, `'user-not-found'` com `mode: 'authenticated'` → 401, `'ok'` com `mode: 'unexistent'` → 409
- [x] 4.3 Implementar avaliação de `rba` com lógica OR: iterar as condições e retornar `true` ao primeiro satisfeito; se nenhuma → 403
- [x] 4.4 Implementar condição `'self'`: `caller.id === params.user_id`
- [x] 4.5 Implementar condição `['minRank', n]`: `rank(caller.role) >= n`; se `params.user_id` presente, verificar também `rank(caller) > rank(target)` via query ao banco
- [x] 4.6 Implementar condição `['sector', value]`: `caller.sector === value` (string) ou `value.includes(caller.sector)` (array)

## 5. Atualizar `createUserSchema` e controller

- [x] 5.1 Em `src/modules/users/dto/create-user.dto.ts`, remover `email` e `role` de `createUserSchema`; manter `name`, `sector`, `cpf` obrigatórios
- [x] 5.2 Em `src/modules/users/users.service.ts`, alterar `create()` para receber `id: string` e `email: string` como parâmetros adicionais e hardcodar `role = 'consultor'`
- [x] 5.3 Em `src/modules/users/users.controller.ts`, atualizar `POST /users`: usar `mode: ['unexistent']`, ler `req.jwtClaims.sub` e `req.jwtClaims.email` e passar para `usersService.create()`
- [x] 5.4 Atualizar todos os demais `@RoutePolicy` no controller para a nova estrutura: `mode: 'authenticated'` sem rba para rotas abertas a todos, `rba: [['minRank', 3], 'self']` para `PATCH`, `rba: [['minRank', 3]]` para `DELETE`

## 6. Finalização

- [x] 6.1 Verificar que todos os testes passam (`npm run test`)
- [x] 6.2 Verificar que não há erros de ESLint nos arquivos modificados (`npm run lint`)
