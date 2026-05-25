## Context

O sistema atual emite tokens JWT com dois claims: `sub` (UUID do usuário em `auth.users`) e `email`. O `JwtGuard` usa o `email` do token para fazer lookup em `public.users`, confiando que o valor é fidedigno. A validação de que `sub` é um UUID válido está no `UsersController.create()`, fora da camada de autenticação. Desde que `id_auth = id_public`, o `sub` é suficiente para identificar univocamente o usuário — o email pode sempre ser obtido do banco.

## Goals / Non-Goals

**Goals:**

- Token JWT carrega apenas `sub`
- `JwtGuard` valida formato UUID do `sub` e resolve usuário por `id`
- `AuthService` provê `getAuthEmail(id)` consultando `auth.users`
- `UsersController.create()` obtém email de `auth.users`, não do token
- `JwtData` reflete apenas `{ sub }`

**Non-Goals:**

- Mudança no mecanismo de emissão do token (Supabase Auth)
- Alteração de qualquer outro claim do token
- Mudança na estrutura da tabela `public.users`

## Decisions

### 1. Lookup por `id` em vez de `email`

**Decisão:** `AuthService.resolveUser` passa a receber `id: string` e consultar `WHERE id = $1`.

**Alternativa considerada:** manter lookup por email e apenas validar contra `auth.users`. Descartada — adiciona uma query extra sem benefício; se o `sub` é o identificador canônico, usá-lo diretamente é mais simples e correto.

### 2. UUID validation no `JwtGuard`

**Decisão:** Após `jwtService.verify()`, o guard verifica se `payload.sub` é UUID v4 válido. Falha resulta em `jwtStatus = 'token-invalid'`.

**Alternativa considerada:** mover para um pipe no controller. Descartada — a validade do `sub` é uma propriedade do token, não da requisição de negócio. O guard é o lugar natural.

### 3. `getAuthEmail` consulta `auth.users`

**Decisão:** novo método `AuthService.getAuthEmail(id)` executa `SELECT email FROM auth.users WHERE id = $1`. Usado exclusivamente no fluxo de `POST /users` (modo `unexistent`), onde o usuário ainda não existe em `public.users`.

**Razão:** garante que o email registrado em `public.users` é exatamente o email da conta de autenticação, eliminando possibilidade de divergência.

**Falha:** se `id` não existir em `auth.users` (usuário deletado do auth), lança `UnauthorizedException`. O `RoutePolicyGuard` já garantiu que `jwtStatus` não é `no-token`/`token-invalid`, então esse caso indica uma inconsistência real.

### 4. `JwtData` com apenas `{ sub }`

**Decisão:** remover `email` de `JwtData` e `JwtPayload`. Nenhum componente downstream deve ler email do token — devem obter do `request.user` (populado pelo guard via DB).

## Risks / Trade-offs

- **Query extra no fluxo de criação** → `getAuthEmail` adiciona uma query a `auth.users` no `POST /users`. Impacto mínimo — é um fluxo de cadastro único por usuário.
- **Acesso ao schema `auth`** → depende de permissão do role do banco para `SELECT` em `auth.users`. Já validado que o acesso existe via `SELECT * FROM auth.users`.

