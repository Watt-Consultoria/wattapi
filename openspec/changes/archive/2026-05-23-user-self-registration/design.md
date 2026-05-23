## Context

O `JwtGuard` atual conflate autenticação (verificar o token) com autorização (exigir que o usuário exista em `public.users`). Isso cria um chicken-and-egg para o fluxo de primeiro acesso via OAuth, e acopla o guard a regras de negócio. O `RoutePolicyGuard` usa modos string monolíticos que não são composíveis e não geram mensagens de erro contextuais.

O JWT do Supabase contém `sub` (UUID do usuário em `auth.users`) e `email`. O `sub` é estável e único — ideal como `id` de `public.users`.

## Goals / Non-Goals

**Goals:**
- Separar autenticação (JwtGuard) de autorização (RoutePolicyGuard) de forma limpa
- Permitir que `POST /users` seja chamado por usuários com token válido mas ainda não registrados
- Tornar os modos de acesso composíveis via array com lógica OR
- Centralizar todas as decisões e mensagens de acesso no RoutePolicyGuard
- Eliminar auto-atribuição de `role` no cadastro

**Non-Goals:**
- Criação de usuários por administradores em nome de outros
- Fluxo de convite ou pré-cadastro
- Mudança no mecanismo de autenticação ou na estrutura do JWT

## Decisions

### D1 — JwtGuard global: enriquece, nunca rejeita (exceto token cryptograficamente inválido)

O JwtGuard é registrado como guard global via `APP_GUARD`. Ele nunca retorna erro HTTP. Ao invés disso, popula `request.jwtStatus` com uma das cinco flags:

```
'no-token'       → sem Authorization header
'token-expired'  → token presente, assinatura válida, mas expirado
'token-invalid'  → token presente, assinatura inválida ou malformado
'user-not-found' → token válido, mas email não existe em public.users
'ok'             → token válido, usuário encontrado
```

Quando `jwtStatus` é `'ok'` ou `'user-not-found'`, `request.jwtClaims = { sub, email }` é populado.
Quando `jwtStatus` é `'ok'`, `request.user = UserResponse` é populado.

`jwtService.verify()` lança `TokenExpiredError` para tokens expirados e `JsonWebTokenError` para tokens inválidos — permite distinguir os dois casos sem ambiguidade.

**Alternativa considerada**: JwtGuard continua rejeitando tokens inválidos/expirados. Rejeitado porque o RoutePolicyGuard não conseguiria distinguir "token expirado" de "token inválido" para gerar mensagens diferentes — o 401 chegaria antes de qualquer contexto.

### D2 — `access` separado em `mode` (portão) e `rba` (restrição adicional)

O campo `access` é um discriminated union baseado em `mode`:

```typescript
type AccessPolicy =
  | { mode: 'unauthenticated' }
  | { mode: 'unexistent' }
  | { mode: 'authenticated'; rba?: RbaCondition[] };

type RbaCondition =
  | 'self'
  | ['minRank', number]           // rank >= n; ['minRank', 3] equivale ao antigo 'superuser'
  | ['sector', string | string[]]; // setor único ou um de vários
```

`mode` é avaliado primeiro. Se passar e `rba` estiver definido, o guard avalia as condições com lógica OR — a requisição passa ao satisfazer qualquer uma. `rba` só é válido com `mode: 'authenticated'` — TypeScript rejeita em compile time via discriminated union.

Mapeamento antigo → novo:

| Antes | Depois |
|---|---|
| `mode: 'authenticated'` | `mode: 'authenticated'` |
| `mode: 'superuser-or-self'` | `mode: 'authenticated', rba: [['minRank', 3], 'self']` |
| `mode: 'superuser-only'` | `mode: 'authenticated', rba: [['minRank', 3]]` |
| `mode: 'superuser-only', noSelfAccess: true` | `mode: 'authenticated', rba: [['minRank', 3]]` |
| `mode: 'min-rank', minRank: 2` | `mode: 'authenticated', rba: [['minRank', 2]]` |

`'superuser'` como modo nomeado é eliminado — é apenas `['minRank', 3]`. O flag `noSelfAccess` desaparece — ausência de `'self'` no `rba` expressa a mesma semântica.

### D3 — RoutePolicyGuard gera mensagens contextuais por mode × jwtStatus

O guard lê `jwtStatus` antes de avaliar `mode` ou `rba` e gera a mensagem de erro adequada:

```
Para mode 'authenticated' ou 'unexistent':
  'no-token'      → 401 "Nenhum token de autenticação fornecido"
  'token-expired' → 401 "Token expirado, faça login novamente"
  'token-invalid' → 401 "Token de autenticação inválido"

Para mode 'authenticated' especificamente:
  'user-not-found' → 401 "Usuário não registrado no sistema"

Para mode 'unexistent' especificamente:
  'ok'             → 409 "Usuário já registrado"
  'user-not-found' → ✓ (caso normal de registro)
```

O controller nunca precisa tratar os casos de acesso negado — o guard já os interceptou.

### D4 — `id` de `public.users` = `sub` do JWT

O endpoint `POST /users` usa `request.jwtClaims.sub` como `id` na inserção. Cria referência direta entre `auth.users.id` e `public.users.id` sem tabela de mapeamento.

### D5 — `role` fixo em `'consultor'` no service, removido do body

`createUserSchema` aceita apenas `{ name, sector, cpf }`. O service hardcoda `role = 'consultor'`. Mudança de role só via `PATCH /users/:id` por caller autorizado.

### D6 — `write` slice mantém chaves `superuser` e `self`

A slice `write: { superuser: string[], self: string[] }` continua com as mesmas chaves — elas ainda correspondem aos modos nomeados e cobrem os casos de escrita atuais sem necessidade de mudança.

## Risks / Trade-offs

- **Race condition em `['unexistent']`**: dois requests simultâneos para o mesmo `sub` passam pelo guard (ambos veem `user-not-found`), chegam ao controller e um deles recebe PK violation do banco → 409 via `throwPgError`. O guard é uma pré-validação, não a única salvaguarda.

- **`['sector', name]` requer `request.user`**: se o status for qualquer coisa que não `'ok'`, a avaliação do modo `sector` cai no erro contextual de autenticação antes de checar o setor. Comportamento correto — sem usuário não há setor a verificar.

- **JwtGuard global em rotas sem `@RoutePolicy`**: rotas como `GET /status` terão o JwtGuard executando (tentando verificar token se presente). Como o guard nunca rejeita, não há impacto funcional — apenas uma query ao banco a menos se não houver token.

## Open Questions

- O banco tem `id UUID DEFAULT gen_random_uuid()` ou apenas `id UUID PRIMARY KEY`? (Inserção explícita do sub funciona em ambos, mas vale confirmar.)
