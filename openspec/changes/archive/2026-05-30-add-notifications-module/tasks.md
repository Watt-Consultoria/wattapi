## 1. Database Migrations

- [x] 1.1 Criar migration `<timestamp>_create-notifications-table.sql` com: enum `notification_origin`, tabela `notifications` (id, user_id, title, description, origin, sent_at, created_by, deleted_at, created_at), e indexes (user_id, sent_at, partial index em `deleted_at IS NULL`)
- [x] 1.2 Criar migration `<timestamp>_schedule-activity-notifications-cron.sql` com `cron.schedule('daily-activity-notifications', '0 3 * * *', ...)` inserindo uma notificação por atividade com `date = today (America/Sao_Paulo)`
- [x] 1.3 Aplicar as migrations no banco local via `supabase db reset` ou `supabase migration up`

## 2. DTOs e Validação

- [x] 2.1 Criar `src/modules/notifications/dto/notification.dto.ts` com: tipos `NotificationRow`, `NotificationResponse`, `CreateNotificationDto` (com `target: { sector?, role? }`), Zod schema `createNotificationSchema` validando title obrigatório e target como objeto com campos opcionais

## 3. Testes (TDD — escrever antes da implementação)

- [x] 3.1 Criar `notifications.service.spec.ts` com testes RED para `findAll`: retorna notificações do usuário, exclui deletadas
- [x] 3.2 Adicionar testes RED para `softDelete`: 204 ao deletar própria, 403 para não-dono, 404 para inexistente
- [x] 3.3 Adicionar testes RED para `createDirected`: 403 para não-superusuário, fan-out correto por target vazio/sector/role/ambos, retorna `{ count: N }`
- [x] 3.4 Criar `notifications.controller.spec.ts` com testes RED para os três endpoints
- [x] 3.5 Confirmar que todos os testes estão RED antes de prosseguir

## 4. Service

- [x] 4.1 Criar `src/modules/notifications/notifications.service.ts` com `findAll(userId)`: SELECT WHERE user_id = $1 AND deleted_at IS NULL ORDER BY sent_at DESC
- [x] 4.2 Implementar `softDelete(id, requesterId)`: busca por id, lança 404 se não encontrado, 403 se user_id != requesterId, UPDATE deleted_at = now()
- [x] 4.3 Implementar `createDirected(requesterId, requesterRank, dto)`: lança 403 se rank < 3, resolve destinatários via SELECT em users com filtros opcionais de sector/role/inactive=false, INSERT em batch, retorna `{ count }`

## 5. Controller

- [x] 5.1 Criar `src/modules/notifications/notifications.controller.ts` com `@Controller('notifications')` e `@UseGuards(RoutePolicyGuard)`
- [x] 5.2 Implementar `GET /notifications` com `@RoutePolicy({ access: { mode: 'authenticated' } })`
- [x] 5.3 Implementar `DELETE /notifications/:id` com `@HttpCode(204)` e `@RoutePolicy({ access: { mode: 'authenticated' } })`
- [x] 5.4 Implementar `POST /notifications` com `@HttpCode(201)`, validação Zod do body e `@RoutePolicy({ access: { mode: 'authenticated' } })` (autorização de superusuário delegada ao service)

## 6. Module

- [x] 6.1 Criar `src/modules/notifications/notifications.module.ts` importando `DatabaseModule` e declarando controller e service
- [x] 6.2 Registrar `NotificationsModule` em `src/app.module.ts`

## 7. Documentação

- [x] 7.1 Atualizar `API.md` com os três novos endpoints: `GET /notifications`, `DELETE /notifications/:id`, `POST /notifications` (incluindo body, response, erros e restrição de superusuário)

## 8. Finalização

- [x] 8.1 Confirmar que todos os testes passam com `npm test`
- [x] 8.2 Confirmar que não há erros de lint nos arquivos modificados com `npm run lint`
