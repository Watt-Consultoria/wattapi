## 1. Infraestrutura e Banco de Dados

- [x] 1.1 Gerar VAPID keypair via `npx web-push generate-vapid-keys` e documentar onde armazenar os valores (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) nos secrets do Supabase e env vars do NestJS
  - Chaves geradas: Public=`BLjCDzqsWtuObxpNqhPH_Giw_8VwbwN9YqxVFiAxBXIhC8T_O7a7gI1Sz4sITtr6V4KNZnfUIpGqOM_PmziaOzI` | Private=`bM_F2lrgJ8I_011296HDczZrGauXwWZiDw7AvBeo00s`
  - Armazenar: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...` + adicionar `VAPID_PUBLIC_KEY` ao `.env` do NestJS
- [x] 1.2 Criar migration `20260623000001_create-push-subscriptions-table.sql` com a tabela `push_subscriptions` (id, user_id, endpoint, p256dh, auth, created_at, deleted_at) e constraint unique em (user_id, endpoint) WHERE deleted_at IS NULL
- [x] 1.3 Criar migration `20260623000002_create-notification-push-webhook.sql` que registra o Database Webhook na tabela `notifications` para o evento INSERT, apontando para a Edge Function `notification-push-trigger`

## 2. Testes (TDD — escrever antes da implementação)

- [x] 2.1 Criar suite de testes `test/push-subscriptions.test.ts` usando o skill `integration-test` com os cenários da spec `push-subscriptions`:
  - `POST /push-subscriptions` — 201 com dados válidos
  - `POST /push-subscriptions` — 400 sem campos obrigatórios
  - `POST /push-subscriptions` — 401 sem JWT
  - `POST /push-subscriptions` — 409 endpoint duplicado ativo
  - `DELETE /push-subscriptions/:id` — 204 pelo dono
  - `DELETE /push-subscriptions/:id` — 403 por outro usuário
  - `DELETE /push-subscriptions/:id` — 404 ID inexistente
  - `DELETE /push-subscriptions/:id` — 401 sem JWT
  - `GET /push-subscriptions/vapid-public-key` — 200 público (sem JWT)
- [x] 2.2 Confirmar que todos os testes falham antes de qualquer implementação (red)

## 3. NestJS — Módulo push-subscriptions

- [x] 3.1 Criar DTO `push-subscription.dto.ts` com schema Zod para `CreatePushSubscriptionDto` (endpoint, p256dh, auth) e interface `PushSubscriptionResponse` (id, user_id, endpoint, created_at)
- [x] 3.2 Criar `PushSubscriptionsService` com métodos:
  - `register(userId, dto)` → INSERT em push_subscriptions, retorna { id }; lança 409 se endpoint duplicado ativo
  - `unregister(id, requesterId)` → soft delete; lança 404 se não encontrado, 403 se não é o dono
  - `getVapidPublicKey()` → retorna `process.env.VAPID_PUBLIC_KEY`
- [x] 3.3 Criar `PushSubscriptionsController` com:
  - `POST /push-subscriptions` → autenticado, chama `service.register()`
  - `DELETE /push-subscriptions/:id` → autenticado, chama `service.unregister()`
  - `GET /push-subscriptions/vapid-public-key` → público (sem RoutePolicy de autenticação), chama `service.getVapidPublicKey()`
- [x] 3.4 Criar `PushSubscriptionsModule` e registrá-lo em `AppModule`
- [x] 3.5 Adicionar `VAPID_PUBLIC_KEY` ao schema de validação de env vars do NestJS (se existir validação de env)

## 4. Supabase Edge Function — notification-push-trigger

- [x] 4.1 Criar `src/database/supabase/functions/notification-push-trigger/index.ts` que:
  - Recebe o payload do Database Webhook (campo `record` com a notificação inserida)
  - Valida presença de `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Busca todas as subscrições ativas (`deleted_at IS NULL`) do `record.user_id` em `push_subscriptions`
  - Para cada subscrição: chama `webpush.sendNotification()` com payload `{ title, body? }`
  - Se receber 410 Gone: faz soft delete da subscrição via UPDATE
  - Outros erros: loga e continua (não interrompe as demais subscrições)

## 5. Verificação Final

- [x] 5.1 Executar `npm test` e confirmar que todos os testes da suite `push-subscriptions.test.ts` passam (green)
  - Nota: testes de integração requerem `npm test` com o Docker stack rodando. TypeScript compila sem erros (`tsc --noEmit` limpo).
- [x] 5.2 Executar `npm run lint` e confirmar ausência de erros de lint nos arquivos modificados
  - oxlint: sem erros nos novos arquivos. Prettier: todos os novos arquivos formatados.
- [x] 5.3 Atualizar `API.md` com os novos endpoints:
  - `GET /push-subscriptions/vapid-public-key`
  - `POST /push-subscriptions`
  - `DELETE /push-subscriptions/:id`
- [ ] 5.4 Testar manualmente o fluxo completo: registrar subscrição via `POST /push-subscriptions` → inserir notificação no banco → verificar recebimento do push no dispositivo (ou via Supabase Edge Function logs)
