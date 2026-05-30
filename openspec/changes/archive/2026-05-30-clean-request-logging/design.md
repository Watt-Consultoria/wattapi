## Context

A aplicação usa o `Logger` nativo do NestJS, que emite ANSI escape codes de cor projetados para TTY. A Vercel captura stdout como texto plano, tornando os logs ilegíveis. Além disso, o `JwtGuard` emite múltiplos logs por request (até 4-6 em caso de sucesso), pulverizando informação em etapas intermediárias sem valor diagnóstico.

O fluxo atual por request autenticada:
```
[JwtGuard] Token received — alg: ES256
[JwtGuard] Verifying ES256 token via JWKS
[JwtGuard] ES256 token valid — sub: <uuid>
[JwtGuard] User resolved — sub: <uuid>, role: admin
```

O fluxo desejado:
```
POST /users/abc | jwt: ok | role: admin | sector: TI
POST /users/abc → 200 | 42ms
```

## Goals / Non-Goals

**Goals:**
- Eliminar ANSI codes dos logs da Vercel
- Reduzir a 2 linhas por request, com todo o contexto relevante
- Centralizar logging em um único lugar (interceptor global)
- Manter warnings de sistema do Nest (falhas de bootstrap, DB, etc.)

**Non-Goals:**
- Estruturação em JSON (logs continuam texto legível por humanos)
- Logging de request body ou response payload
- Integração com sistemas externos (Datadog, Sentry, etc.)
- Logging de erros de nível de aplicação (cada serviço pode manter seus próprios)

## Decisions

### D1: Interceptor global em vez de middleware

**Decisão:** `LoggingInterceptor` registrado como `APP_INTERCEPTOR` no `AppModule`.

**Por quê:** O interceptor executa depois dos guards (`JwtGuard`, `RoutePolicyGuard`), então `request.jwtStatus` e `request.user` já estão populados quando o log de entrada é emitido. Um middleware executaria antes dos guards, sem acesso a esses dados.

**Alternativa descartada:** Middleware global — executa antes dos guards, sem acesso ao user resolvido.

### D2: `logger: ['error', 'warn']` no bootstrap

**Decisão:** Passar `{ logger: ['error', 'warn'] }` para `NestFactory.create`.

**Por quê:** Elimina completamente a saída colorida do Nest para requests (que é `LOG`), mas preserva `ERROR` e `WARN` para falhas de infraestrutura (conexão com DB, módulo não inicializado, etc.). Não requer implementar um `CustomLogger`.

**Alternativa descartada:** `logger: false` — silencia também erros de sistema úteis para diagnóstico.

### D3: JwtGuard sem logging

**Decisão:** Remover todos os `this.logger.*` do `JwtGuard`.

**Por quê:** O guard já comunica seu resultado via `request.jwtStatus`. O interceptor lê esse valor e o inclui no log de entrada. Logar no guard seria duplicação.

### D4: Formato de log em texto livre (não JSON)

**Decisão:** Logs em formato humano: `METHOD /path | jwt: <status> | role: <role> | sector: <sector>`.

**Por quê:** Os logs são consumidos primariamente via dashboard da Vercel por humanos. JSON seria overhead sem benefício imediato (não há parsing automatizado configurado).

## Risks / Trade-offs

- **Logs de erro do RoutePolicyGuard sumidos:** Quando o guard lança `ForbiddenException`, o NestJS captura e responde 403 — o interceptor vê o status code 403 no `tap/catchError`, então o log de saída ainda registra. Sem risco.
- **Exceções não-HTTP:** Se um service lançar um erro inesperado, o `ExceptionFilter` padrão do Nest retorna 500. O interceptor captura via `catchError` do RxJS e loga o status 500. Coberto.
- **`request.user` undefined em rotas públicas:** Para requests sem autenticação, `role` e `sector` serão `—`. Tratado explicitamente no interceptor com fallback.
