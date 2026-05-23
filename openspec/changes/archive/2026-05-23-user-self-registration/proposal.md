## Why

O endpoint `POST /users` foi projetado para ser chamado na primeira vez que um usuário se autentica via Supabase OAuth — o usuário já existe em `auth.users` mas ainda não em `public.users`. Porém, o `JwtGuard` atual chama `resolveUser(email)` e lança `401` se o usuário não existir em `public.users`, criando um problema de chicken-and-egg: para criar o usuário, o usuário já precisa existir.

Além disso, a arquitetura atual mistura responsabilidades: o `JwtGuard` conhece regras de negócio (exige que o usuário exista no sistema), e os modos de acesso do `RoutePolicyGuard` são strings monolíticas (`superuser-or-self`) em vez de condições composíveis. O `createUserSchema` aceita `role` no body, permitindo auto-atribuição de privilégios.

## What Changes

### JwtGuard → middleware global de enriquecimento

O `JwtGuard` passa a ser aplicado globalmente e nunca rejeita requisições. Em vez disso, popula `request.jwtStatus` com uma flag indicando o estado da autenticação, e popula `request.jwtClaims` e `request.user` quando possível.

### RoutePolicyGuard → árbitro centralizado de acesso

O `RoutePolicyGuard` passa a ler `request.jwtStatus` e gerar respostas de erro contextuais e inteligíveis. O campo `access.mode` torna-se um array de condições avaliadas com lógica OR — a requisição passa se satisfizer qualquer uma delas.

O campo `access` passa a ser um discriminated union com dois níveis: `mode` (`'unauthenticated' | 'unexistent' | 'authenticated'`) como portão de entrada, e `rba?: RbaCondition[]` como restrição adicional avaliada com lógica OR, válida apenas com `mode: 'authenticated'`. As condições de `rba` são: `'self'`, `['minRank', number]` e `['sector', string | string[]]`. O modo nomeado `'superuser'` é eliminado — equivale a `['minRank', 3]`. O flag `noSelfAccess` é eliminado — ausência de `'self'` no `rba` expressa a mesma semântica.

### POST /users

- Usa `id = jwtClaims.sub` e `email = jwtClaims.email` — nenhum dos dois vem do body
- `role` removido do body, sempre `'consultor'` na criação
- Recebe `mode: ['unexistent']`, que rejeita com 409 se o usuário já existir (guard) ou com 401 contextual se o token for inválido/ausente

## Capabilities

### Modified Capabilities

- `create-user`: endpoint reescrito para auto-registro via OAuth; id e email vêm do JWT, role fixo em consultor, guard rejeita re-registro com 409
- `jwt-verification`: JwtGuard torna-se global e não-rejeitante; introduz `jwtStatus`; RoutePolicyGuard assume a responsabilidade de rejeitar e gerar mensagens contextuais
- `route-policy`: modo `access.mode` torna-se array composável; novos modos `unexistent`, `unauthenticated`, `['minRank', n]`, `['sector', name]`; eliminação de `noSelfAccess` e modos monolíticos

## Impact

- `src/modules/auth/jwt.guard.ts` — remover toda lógica de rejeição; adicionar `jwtStatus`, sempre tentar enriquecer a request
- `src/modules/auth/decorators/route-policy.decorator.ts` — reescrever `AccessMode` como union de strings e tuplas; `mode` vira `AccessMode[]`; remover `minRank` e `noSelfAccess` de `AccessPolicy`
- `src/modules/auth/route-policy.guard.ts` — reescrever avaliação de modos; adicionar leitura de `jwtStatus`; lógica OR entre modos; mensagens de erro contextuais
- `src/modules/users/dto/create-user.dto.ts` — remover `email` e `role` de `createUserSchema`
- `src/modules/users/users.controller.ts` — `POST /users` usa `mode: ['unexistent']`, lê `jwtClaims` da request; atualizar todos os `@RoutePolicy` para novo formato de array
- `src/modules/users/users.service.ts` — `create()` recebe `id` e `email` explicitamente, hardcoda `role = 'consultor'`
- `src/app.module.ts` — registrar `JwtGuard` como guard global via `APP_GUARD`
- Sem mudanças de schema de banco de dados
