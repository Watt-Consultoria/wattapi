### Requirement: LoggingInterceptor emite 2 linhas por request

O sistema SHALL ter um `LoggingInterceptor` registrado globalmente que emite exatamente 2 linhas de log por request HTTP:

- **Linha 1 (incoming):** emitida assim que o interceptor envolve o handler, com `request.jwtStatus` e `request.user` já populados pelo `JwtGuard`. Formato: `<METHOD> <path> | jwt: <jwtStatus> | role: <role> | sector: <sector>`
- **Linha 2 (outgoing):** emitida após a resolução (sucesso ou erro). Formato: `<METHOD> <path> → <statusCode> | <durationMs>ms`

O interceptor SHALL usar `Logger` do NestJS com o contexto `'Request'`.

#### Scenario: Request autenticada com sucesso

- **WHEN** uma request `POST /users/abc` chega com token válido de um usuário com role `admin` e sector `TI`
- **THEN** o interceptor SHALL emitir:
  - `POST /users/abc | jwt: ok | role: admin | sector: TI`
  - `POST /users/abc → 201 | 42ms`

#### Scenario: Request sem token

- **WHEN** uma request `GET /status` chega sem Authorization header
- **THEN** o interceptor SHALL emitir:
  - `GET /status | jwt: no-token | role: — | sector: —`
  - `GET /status → 200 | 5ms`

#### Scenario: Request com token inválido ou expirado

- **WHEN** uma request chega com `jwtStatus` de `token-expired` ou `token-invalid`
- **THEN** o interceptor SHALL refletir o jwtStatus real na linha 1 e o HTTP status (ex: 401) na linha 2

#### Scenario: Request resulta em erro HTTP (ex: 403, 404)

- **WHEN** um guard ou serviço lança uma exceção HTTP
- **THEN** o interceptor SHALL capturar via `catchError` e emitir a linha 2 com o status code correto (ex: `→ 403 | 12ms`), então relançar o erro para o ExceptionFilter do Nest tratar

#### Scenario: Usuário sem role/sector (request pública)

- **WHEN** `request.user` é undefined
- **THEN** o interceptor SHALL usar `—` como fallback para `role` e `sector`

### Requirement: Logger do Nest configurado sem cores em produção

O bootstrap da aplicação SHALL configurar `NestFactory.create` com `logger: ['error', 'warn']` para eliminar saída colorida (ANSI escape codes) dos logs de request, preservando apenas logs de nível `error` e `warn` do Nest para eventos de infraestrutura.

#### Scenario: Logs legíveis na Vercel

- **WHEN** a aplicação está rodando em ambiente de produção (Vercel)
- **THEN** os logs SHALL aparecer como texto plano sem códigos `␛[32m` ou similares
