## 1. Database & Storage

- [x] 1.1 Criar migration SQL: enum `reimbursement_category`, tabela `reimbursements` e tabela `reimbursement_attachments`
- [x] 1.2 Aplicar a migration via `supabase db push` e confirmar que as tabelas existem
- [x] 1.3 Criar bucket privado `reimbursement-receipts` no Supabase Storage com Storage Policy permitindo upload somente para usuários autenticados no path `receipts/{userId}/...`

## 2. DTOs & Validação

- [x] 2.1 Criar `src/modules/reimbursements/dto/reimbursement.dto.ts` com schemas Zod para: `CreateReimbursementDto` (title, description, amount_cents, category, pix_key, attachments), `UpdateReimbursementStatusDto` (status: approved | rejected), tipos de response `ReimbursementRow`, `ReimbursementResponse`

## 3. Testes (TDD — escrever antes da implementação)

- [x] 3.1 Criar `src/modules/reimbursements/reimbursements.service.spec.ts` com casos de teste para:
  - `create`: retorna reembolso criado com attachments
  - `findAll` com `target=me`: retorna apenas os do caller
  - `findAll` com `target=all` por superuser: retorna todos
  - `findAll` com `target=all` por não-superuser: lança `ForbiddenException`
  - `findByUser` por superuser: retorna reembolsos do user_id
  - `findByUser` por não-superuser: lança `ForbiddenException`
  - `updateStatus` de `pending → approved`: sucesso
  - `updateStatus` de `pending → rejected`: sucesso
  - `updateStatus` de status já resolvido: lança `BadRequestException`
  - `updateStatus` com `status=pending`: lança `BadRequestException`
  - `updateStatus` com reembolso não encontrado: lança `NotFoundException`
- [x] 3.2 Confirmar que todos os testes falham (RED) antes de implementar

## 4. Service

- [x] 4.1 Criar `src/modules/reimbursements/reimbursements.service.ts` com método `create(userId, dto)`: INSERT em `reimbursements` + INSERT em `reimbursement_attachments` em transação
- [x] 4.2 Implementar método `findAll(caller, target)`: retorna reembolsos do caller se `target=me`; lança `ForbiddenException` se `target=all` e não-superuser; retorna todos se superuser
- [x] 4.3 Implementar método `findByUser(caller, userId)`: lança `ForbiddenException` se não-superuser; retorna reembolsos do userId
- [x] 4.4 Implementar método `updateStatus(id, dto)`: verifica existência (404), verifica status atual não resolvido (400), atualiza status
- [x] 4.5 Implementar helper privado `withSignedUrls(reimbursements[])`: para cada attachment, gera signed URL via `supabase.storage.createSignedUrl(path, 3600)` e substitui o path no response
- [x] 4.6 Confirmar que todos os testes passam (GREEN)

## 5. Controller

- [x] 5.1 Criar `src/modules/reimbursements/reimbursements.controller.ts` com:
  - `POST /reimbursements` — `@RoutePolicy({ access: { mode: 'authenticated' } })`, valida body com Zod, chama `service.create`
  - `GET /reimbursements` — `@RoutePolicy({ access: { mode: 'authenticated' } })`, lê query param `target` (default `'me'`), chama `service.findAll`
  - `GET /reimbursements/:user_id` — `@RoutePolicy({ access: { mode: 'authenticated' } })`, chama `service.findByUser`
  - `PATCH /reimbursements/:id/status` — `@RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 4]] } })`, valida body, chama `service.updateStatus`

## 6. Module & Registro

- [x] 6.1 Criar `src/modules/reimbursements/reimbursements.module.ts` importando `DatabaseModule` e declarando controller e service
- [x] 6.2 Registrar `ReimbursementsModule` no `AppModule`

## 7. Documentação da API

- [x] 7.1 Atualizar `API.md` com as 4 novas rotas: método, path, descrição, access control, request body/params, response shape e exemplos

## 8. Verificação Final

- [x] 8.1 Executar `npm test` e confirmar que todos os testes passam
- [x] 8.2 Executar o linter nos arquivos modificados e confirmar ausência de erros ESLint
