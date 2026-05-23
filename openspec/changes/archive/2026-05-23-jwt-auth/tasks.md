## 1. Setup

- [x] 1.1 Instalar dependência: `npm install @nestjs/jwt`
- [x] 1.2 `JWT_SECRET` já existe no schema Zod em `src/config/env.ts` — nenhuma alteração necessária
- [x] 1.3 `JWT_SECRET` já existe em `.env.development` — nenhuma alteração necessária

## 2. Tests (RED Phase)

Criar `src/modules/auth/auth.controller.spec.ts` com testes de integração para `GET /auth/me`. Seguir o padrão já estabelecido em `users.controller.spec.ts` (fetch + orchestrator).

Para gerar tokens de teste, usar `@nestjs/jwt` ou `jsonwebtoken` diretamente no setup do teste com o mesmo `SUPABASE_JWT_SECRET` do ambiente de teste.

- [x] 2.1 `GET /auth/me` — sem header `Authorization` retorna HTTP 401
- [x] 2.2 `GET /auth/me` — header presente mas sem prefixo `Bearer ` retorna HTTP 401
- [x] 2.3 `GET /auth/me` — token com assinatura inválida retorna HTTP 401
- [x] 2.4 `GET /auth/me` — token expirado retorna HTTP 401
- [x] 2.5 `GET /auth/me` — token válido mas email sem registro em `public.users` retorna HTTP 401
- [x] 2.6 `GET /auth/me` — token válido mas usuário está inativo (`inactive = true`) retorna HTTP 401
- [x] 2.7 `GET /auth/me` — token válido e usuário ativo retorna HTTP 200 com o objeto `UserResponse` completo
- [x] 2.8 Executar `npm test -- --testPathPattern=auth.controller` e confirmar que **todos os novos testes estão em RED** antes de prosseguir

## 3. Implementação

- [x] 3.1 Criar `src/modules/auth/auth.service.ts`:
  - Método `resolveUser(email: string): Promise<UserResponse>` que executa `SELECT ... FROM users WHERE email = $1 AND inactive = false`
  - Lança `UnauthorizedException` se não encontrado

- [x] 3.2 Criar `src/modules/auth/jwt.guard.ts`:
  - Implementar `CanActivate`
  - Extrair token do header `Authorization: Bearer <token>`; lançar `UnauthorizedException` se ausente ou mal formatado
  - Verificar token com `jwtService.verify()`; lançar `UnauthorizedException` em qualquer erro
  - Chamar `authService.resolveUser(payload.email)` e atribuir o resultado a `request.user`

- [x] 3.3 Criar `src/modules/auth/decorators/current-user.decorator.ts`:
  - `@CurrentUser()` extrai `request.user` tipado como `UserResponse`

- [x] 3.4 Criar `src/modules/auth/auth.controller.ts`:
  - `GET /auth/me` decorado com `@UseGuards(JwtGuard)`
  - Retorna `@CurrentUser() user: UserResponse`

- [x] 3.5 Criar `src/modules/auth/auth.module.ts`:
  - Importar `JwtModule.registerAsync()` com `JWT_SECRET` via `EnvService`
  - Importar `DatabaseModule` (para `AuthService` acessar o DB)
  - Declarar e exportar `JwtGuard`, `AuthService`, `AuthController`

- [x] 3.6 Registrar `AuthModule` em `src/app.module.ts`

## 4. GREEN Phase

- [x] 4.1 Executar `npm test -- --testPathPattern=auth.controller` e confirmar que **todos os testes passam (GREEN)**
- [x] 4.2 Executar `npm test` completo e confirmar que não há regressões nos testes de `users.controller`
- [x] 4.3 Verificar que não há erros de ESLint nos arquivos modificados/criados: `npx eslint src/modules/auth/ src/config/env.service.ts src/app.module.ts`
