## 1. Testes (TDD — escrever antes da implementação)

- [x] 1.1 Criar `src/common/interceptors/logging.interceptor.spec.ts` com testes que falham:
  - Request autenticada: verifica que 2 logs são emitidos com método, path, jwt status, role, sector, status code e duração
  - Request sem token: verifica fallback `—` para role e sector
  - Request que resulta em erro HTTP (403): verifica que a linha 2 captura o status code correto via `catchError`
- [x] 1.2 Confirmar que os testes estão em estado RED (`npm test -- logging.interceptor`)

## 2. Remover logging do JwtGuard

- [x] 2.1 Em `src/common/guards/jwt.guard.ts`, remover a propriedade `private readonly logger = new Logger(JwtGuard.name)`
- [x] 2.2 Remover todos os `this.logger.log(...)` e `this.logger.warn(...)` do guard
- [x] 2.3 Remover `Logger` e `OnModuleInit` dos imports do `@nestjs/common` se não forem mais usados (manter `OnModuleInit` pois ainda é usado para o JWKS client)

## 3. Criar LoggingInterceptor

- [x] 3.1 Criar `src/common/interceptors/logging.interceptor.ts` com a classe `LoggingInterceptor` implementando `NestInterceptor`
- [x] 3.2 Implementar linha 1 (incoming): ler `request.method`, `request.path`, `request.jwtStatus`, `request.user?.role`, `request.user?.sector` — usar `—` como fallback quando undefined
- [x] 3.3 Implementar linha 2 (outgoing): capturar `Date.now()` antes do `next.handle()`, usar `tap` para sucesso e `catchError` para erros HTTP — extrair status code da resposta ou do `HttpException`, emitir duração em ms, relançar o erro no `catchError`

## 4. Registrar interceptor e configurar bootstrap

- [x] 4.1 Em `src/app.module.ts`, adicionar `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }` aos providers e importar de `@nestjs/core`
- [x] 4.2 Em `src/main.ts`, passar `{ logger: ['error', 'warn'] }` como segundo argumento de `NestFactory.create`

## 5. Verificação

- [x] 5.1 Rodar `npm test -- logging.interceptor` e confirmar que os testes estão GREEN
- [x] 5.2 Rodar `npm test` e confirmar que todos os testes passam
- [x] 5.3 Verificar que não há erros de lint nos arquivos modificados (`npx oxlint src/common/guards/jwt.guard.ts src/common/interceptors/logging.interceptor.ts src/app.module.ts src/main.ts`)
- [ ] 5.4 Subir a aplicação localmente e fazer uma request autenticada e uma sem token, confirmar que exatamente 2 linhas por request aparecem no console sem ANSI codes
