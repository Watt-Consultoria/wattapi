## Why

Os logs da aplicação aparecem com ANSI escape codes ilegíveis na Vercel (ex: `␛[32m[Nest] 4  - ␛[39m`) e contêm etapas intermediárias de verificação JWT desnecessárias, dificultando o diagnóstico em produção. A solução centraliza o logging em um interceptor global que emite exatamente 2 linhas por request: dados da requisição e status de resolução.

## What Changes

- Remover todos os `this.logger.*` do `JwtGuard` (incluindo a injeção de `Logger`)
- Criar `LoggingInterceptor` global que loga 2 linhas por request:
  - **Linha 1 (incoming):** método + path + jwt status + role + sector do requester
  - **Linha 2 (outgoing):** método + path + HTTP status code + duração em ms
- Registrar `LoggingInterceptor` como `APP_INTERCEPTOR` em `AppModule`
- Configurar `NestFactory.create` com `logger: ['error', 'warn']` para eliminar ANSI codes de saída do Nest em produção

## Capabilities

### New Capabilities

- `request-logging`: Interceptor global que registra entrada e saída de cada HTTP request com contexto de autenticação e identidade do requester

### Modified Capabilities

- `jwt-verification`: O guard deixa de ser responsável por logging — apenas popula `request.jwtStatus` e `request.user`

## Impact

- `src/common/guards/jwt.guard.ts`: remoção de todos os logs
- `src/common/interceptors/logging.interceptor.ts`: criação do interceptor
- `src/app.module.ts`: registro do `APP_INTERCEPTOR`
- `src/main.ts`: configuração do logger do Nest
- Sem impacto em APIs, contratos externos ou banco de dados
