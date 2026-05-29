## 1. Testes (TDD — escrever antes de ajustar implementação)

- [x] 1.1 Em `jwt.guard.spec.ts`, adicionar mock para `jose` (`jest.mock('jose')`) e criar helper que gera um JWT header com `alg: "ES256"` encodado em base64url
- [x] 1.2 Escrever teste: token ES256 válido → `jwtStatus = 'ok'`, `jwtData.sub` correto, `user` populado (deve falhar antes da implementação estar completa)
- [x] 1.3 Escrever teste: token ES256 expirado (erro com mensagem `"expired"` do `jose`) → `jwtStatus = 'token-expired'`
- [x] 1.4 Escrever teste: token ES256 com assinatura inválida → `jwtStatus = 'token-invalid'`
- [x] 1.5 Escrever teste: token ES256 com `sub` não-UUID → `jwtStatus = 'token-invalid'`
- [x] 1.6 Escrever teste: token HS256 — confirmar que `jwtVerify` do `jose` NÃO é chamado, apenas `jwtService.verify`
- [x] 1.7 Confirmar que todos os novos testes estão em RED (`npm test -- --testPathPattern=jwt.guard`)

## 2. Implementação

- [x] 2.1 Verificar que `jwt.guard.ts` faz `onModuleInit` com `createRemoteJWKSet` usando `SUPABASE_URL` do `EnvService`
- [x] 2.2 Verificar que o branch `alg === 'ES256'` usa `jwtVerify(token, this.jwks)` do `jose` e extrai `payload.sub`
- [x] 2.3 Garantir que o catch do branch ES256 mapeia erro com mensagem contendo `"expired"` para `jwtStatus = 'token-expired'` e outros para `'token-invalid'`
- [x] 2.4 Garantir que o branch HS256 (fallback) continua usando `jwtService.verify<JwtPayload>(token)` e capturando `TokenExpiredError`

## 3. Testes

- [x] 3.1 Executar `npm test -- --testPathPattern=jwt.guard` e confirmar que todos os testes (novos + existentes) estão em GREEN
- [x] 3.2 Revisar cobertura: os cenários dos specs (ES256 válido, expirado, inválido, sub inválido, HS256 válido) devem todos ter testes correspondentes

## 4. Finalização

- [x] 4.1 Executar `npm run lint` nos arquivos modificados e corrigir eventuais erros de ESLint/TypeScript
- [x] 4.2 Executar `npm test` completo e confirmar que nenhum teste existente regrediu
