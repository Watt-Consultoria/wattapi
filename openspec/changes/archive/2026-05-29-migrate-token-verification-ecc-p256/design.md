## Context

O Supabase assina tokens de sessão com ECDSA P-256 (ES256). O backend precisava verificar esses tokens sem depender de um secret simétrico compartilhado. A biblioteca `jose` (já presente no projeto) fornece `createRemoteJWKSet` + `jwtVerify`, que fazem fetch e cache das chaves públicas do endpoint JWKS do Supabase e verificam a assinatura EC. Tokens emitidos internamente (login com credenciais próprias da API) continuam usando HS256 com `JWT_SECRET`.

## Goals / Non-Goals

**Goals:**
- Verificar tokens ES256 do Supabase via JWKS remoto sem hardcoded secret
- Manter verificação HS256 para tokens internos (sem breaking change no fluxo de login próprio)
- Inicializar o JWKS client uma única vez no boot, não por requisição

**Non-Goals:**
- Trocar a biblioteca `jose` por outra
- Suportar outros algoritmos além de ES256 e HS256
- Implementar refresh automático de token no backend

## Decisions

### Detecção de algoritmo via header JWT

Decodificamos o campo `alg` do header do JWT (sem verificação de assinatura) para decidir qual caminho seguir. Alternativa descartada: tentar ES256 sempre e fazer fallback em erro — isso cria latência desnecessária e erros enganosos nos logs.

### JWKS fetchado e cacheado no `onModuleInit`

`createRemoteJWKSet` retorna uma função que faz fetch lazy e cache das chaves em memória. Chamamos essa factory no `onModuleInit` para que a instância esteja pronta antes de chegarem requisições. Alternativa descartada: fetch na primeira requisição — adiciona latência cold-start e pode causar race condition.

### Fallback HS256 permanece via `JwtService.verify`

Tokens emitidos pela própria API (rotas de login internas) usam HS256. Mantemos o `JwtService` do NestJS para esses casos, pois ele já está configurado com `JWT_SECRET` e lida com `TokenExpiredError` do `jsonwebtoken`. Alternativa descartada: migrar tudo para `jose` — aumentaria o escopo sem benefício imediato.

### Mapeamento de erro `JWTExpired` do `jose`

O `jose` lança um erro com `code: 'ERR_JWT_EXPIRED'` (e mensagem contendo `"expired"`) para tokens expirados. O guard captura tanto `TokenExpiredError` (do `jsonwebtoken`, para HS256) quanto erros com mensagem contendo `"expired"` (para ES256), setando `jwtStatus = 'token-expired'` em ambos.

## Risks / Trade-offs

- **[Risco] JWKS endpoint indisponível no boot** → Se o Supabase estiver offline ao iniciar, `createRemoteJWKSet` falha silenciosamente no init (o fetch é lazy); a primeira requisição com ES256 falhará com `token-invalid`. Mitigação: monitorar logs de erro no guard; a recuperação é automática assim que o Supabase volta.

- **[Trade-off] Rotação de chaves no Supabase** → `createRemoteJWKSet` do `jose` v4 refaz o fetch quando encontra um `kid` não cacheado, portanto rotação de chaves é tratada automaticamente sem restart.

- **[Risco] Algoritmo `none` ou outro desconhecido** → Tokens com `alg != 'ES256'` caem no path HS256; se o `JWT_SECRET` não bater, `jwtService.verify` lança e o guard seta `token-invalid`. Não há bypass possível.

## Migration Plan

1. Garantir que `SUPABASE_URL` está configurada corretamente em todos os ambientes.
2. Fazer deploy do `JwtGuard` atualizado — ele é retrocompatível (HS256 continua funcionando).
3. Validar com um token real do Supabase (ES256) no ambiente de staging.
4. Rollback: reverter o `jwt.guard.ts` para a versão anterior que usava apenas `jwtService.verify`; sem mudança de schema ou dados necessária.
