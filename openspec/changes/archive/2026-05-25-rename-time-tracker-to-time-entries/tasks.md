## 1. Testes (RED)

- [x] 1.1 Atualizar testes existentes em `time-tracking.controller.spec.ts` para usar os novos paths (`/time-entries/clock-in`, `/time-entries/clock-out`, `/time-entries/summary/me`) e confirmar que falham com os paths antigos
- [x] 1.2 Adicionar testes para `GET /time-entries/summary/:userId` (superusuário consultando outro usuário e tentativa sem permissão)
- [x] 1.3 Executar `npm test` e confirmar que os novos/modificados testes estão em estado RED

## 2. Implementação do Controller

- [x] 2.1 Alterar `@Controller('time-tracking')` para `@Controller('time-entries')` em `time-tracking.controller.ts`
- [x] 2.2 Renomear handler `@Get('summary')` para `@Get('summary/me')` — remover lógica de `?user_id`, sempre usar `req.jwtData.sub` como `targetUserId`
- [x] 2.3 Adicionar novo handler `@Get('summary/:userId')` antes de `summary/me` não — **depois** — declarar `summary/me` ANTES de `summary/:userId` para evitar conflito de rota; restringir a superusuários via verificação de `isSuperuser(requesterRole)`, retornando 403 caso contrário

## 3. Atualização dos Specs

- [x] 3.1 Atualizar `openspec/specs/time-tracking/spec.md` com os novos paths de rota e os dois endpoints de summary (arquivo base do projeto, não o delta da change)

## 4. Testing (GREEN)

- [x] 4.1 Executar `npm test` e confirmar que todos os testes passam
- [x] 4.2 Verificar manualmente com `curl` ou cliente HTTP que `POST /time-entries/clock-in`, `POST /time-entries/clock-out`, `GET /time-entries/summary/me` e `GET /time-entries/summary/:userId` respondem corretamente

## 5. Finalização

- [x] 5.1 Verificar que não há erros de ESLint nos arquivos modificados (`npx eslint src/modules/time-tracking/`)
- [x] 5.2 Executar `npm test` completo para garantir que nenhum outro módulo foi afetado
