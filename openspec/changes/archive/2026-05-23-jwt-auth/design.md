## Context

O projeto é uma API NestJS com PostgreSQL via Supabase. O frontend (repositório separado) autentica usuários via OAuth usando Supabase Auth e recebe um JWT assinado com HS256. O backend deve verificar esse token e resolver a identidade do usuário em `public.users` para permitir um sistema de autorização futuro baseado em `role` e `sector`.

O `DatabaseService` já instancia o cliente Supabase (`supabase-js`) e expõe um pool PostgreSQL direto (`pg`). O `EnvService` já valida variáveis de ambiente via Zod.

## Goals / Non-Goals

**Goals:**

- Verificar JWTs do Supabase localmente usando `SUPABASE_JWT_SECRET` (sem chamada de rede)
- Resolver o usuário do JWT para o registro correspondente em `public.users` via campo `email`
- Retornar HTTP 401 em qualquer falha: token ausente, inválido, expirado, ou email sem registro ativo em `public.users`
- Expor `req.user` (tipado como `UserResponse`) para uso nos controllers via decorator `@CurrentUser()`
- Entregar `GET /auth/me` como rota protegida de referência

**Non-Goals:**

- Proteger as rotas existentes de `/users` — escopo do change de autorização
- Criar usuário automaticamente na primeira autenticação
- Suporte a múltiplos provedores de JWT (apenas Supabase)
- Refresh de tokens

## Decisions

### 1. Verificação local com `@nestjs/jwt` + `SUPABASE_JWT_SECRET`

Usaremos `JwtModule` do pacote `@nestjs/jwt` para verificar o token localmente. O `SUPABASE_JWT_SECRET` está disponível no dashboard do Supabase em Settings → API → JWT Secret.

**Alternativa considerada:** `supabase.auth.getUser(token)` (verificação remota). Rejeitada por adicionar latência de rede em toda requisição autenticada e criar dependência de disponibilidade do Supabase Auth em cada request.

### 2. Bridge JWT → `public.users` via email

O payload do JWT do Supabase contém `email`. Nossa tabela `public.users` tem `email UNIQUE NOT NULL`. Usaremos `SELECT * FROM users WHERE email = $1 AND inactive = false` para resolver o usuário.

**Alternativa considerada:** adicionar coluna `auth_id` em `public.users` (armazena `auth.users.id` = `JWT.sub`). Descartada por agora porque exigiria migration e um fluxo de vínculo explícito. O email é suficiente dado que: (a) o fluxo de cadastro é feito por admin e usa o mesmo email; (b) o email já é `UNIQUE` na tabela.

**Trade-off aceito:** se um usuário alterar o email no Supabase Auth sem atualizar `public.users`, o login quebrará. Isso é aceitável no contexto atual (usuários gerenciados por admin).

### 3. Guard NestJS (`CanActivate`) em vez de middleware Express

`JwtGuard` implementa `CanActivate` — o padrão idiomático do NestJS para proteção de rotas. Permite composição futura com `RolesGuard` via `@UseGuards(JwtGuard, RolesGuard)`.

**Alternativa considerada:** middleware Express global com `app.use()`. Rejeitada por ser menos integrável com o sistema de guards/decorators do NestJS.

### 4. Guard não é global por padrão

`JwtGuard` será aplicado por rota (`@UseGuards(JwtGuard)`), não via `APP_GUARD`. Isso permite que rotas públicas (como `GET /status`) continuem acessíveis sem token.

### 5. `AuthService` faz o lookup do usuário — não o guard diretamente

O guard delega a lógica de negócio ao `AuthService` (verifica JWT + busca usuário). Isso mantém o guard fino e o serviço testável de forma isolada.

## Fluxo de autenticação

```
Request
  │
  ▼
JwtGuard.canActivate()
  │
  ├── extrai "Authorization: Bearer <token>"
  │      └── ausente → UnauthorizedException (401)
  │
  ├── jwtService.verify(token, { secret: SUPABASE_JWT_SECRET })
  │      └── inválido / expirado → UnauthorizedException (401)
  │
  ├── authService.resolveUser(payload.email)
  │      └── SELECT ... WHERE email = $1 AND inactive = false
  │             └── não encontrado → UnauthorizedException (401)
  │
  └── request.user = UserResponse  →  continua para o handler
```

## Riscos / Trade-offs

- **[Email mutable]** O email no JWT pode divergir de `public.users.email` se alterado no Supabase Auth sem atualizar o banco. → Mitigation: fora do escopo desta change; documentar como open question.
- **[JWT secret rotation]** Rotacionar o `SUPABASE_JWT_SECRET` invalida todos os tokens em circulação imediatamente. → Mitigation: comportamento esperado para rotação de segredo; documentar nos runbooks operacionais.
- **[Usuários inativos]** Um usuário desativado via `DELETE /users/:id` fica automaticamente sem acesso, pois o guard filtra `inactive = false`. → Mitigation: comportamento desejado — nenhuma ação adicional necessária.

## Open Questions

- Quando migrarmos para autorização, `GET /users` (listagem) deve exigir qual role mínimo?
- Vale adicionar `auth_id` à tabela `public.users` no futuro para tornar o vínculo mais robusto? (Avaliar quando houver requisito de troca de email.)
