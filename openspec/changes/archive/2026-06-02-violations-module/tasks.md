## 1. Migrations e Seed

- [x] 1.1 Criar migration `create-company-norms-table.sql`: enum `norm_severity`, tabela `company_norms` com colunas `id`, `code` (UNIQUE), `description`, `severity`, `created_at`, `updated_at`
- [x] 1.2 Criar migration `seed-company-norms.sql`: inserir as 31 normas AN01–AN31 com descriptions e severidades do estatuto
- [x] 1.3 Criar migration `create-member-violations-table.sql`: tabela `member_violations` com colunas `id`, `user_id`, `norm_id`, `applied_by`, `reason`, `expires_at`, `cancelled_at`, `cancelled_by`, `applied_at`, `created_at` e índices em `user_id` e `(user_id, cancelled_at, expires_at)`

## 2. EmailModule (infraestrutura)

- [x] 2.1 Instalar dependência `resend` via `npm install resend`
- [x] 2.2 Criar `src/modules/email/email.module.ts` como `@Global()` registrando `EmailService`
- [x] 2.3 Criar `src/modules/email/email.service.ts` com método `sendViolationNotification(payload)`: inicializa cliente Resend com `RESEND_API_KEY`, comportamento no-op se key ausente, try/catch que loga erro sem propagar
- [x] 2.4 Criar `src/modules/email/dto/email.dto.ts` com interface `ViolationNotificationPayload` (memberName, memberEmail, normCode, normDescription, severity, points, reason, expiresAt, currentScore, atRisk)
- [x] 2.5 Implementar modo dev no `EmailService`: se `NODE_ENV=development` e `EMAIL_DEV_REDIRECT` não definido → logar payload no console; se `EMAIL_DEV_REDIRECT` definido → redirecionar destinatário e prefixar subject com `[DEV → original@email.com]`
- [x] 2.6 Importar `EmailModule` no `AppModule`
- [x] 2.7 Adicionar `RESEND_API_KEY` e `EMAIL_DEV_REDIRECT` (opcional, para dev) ao `.env.example` com comentários explicativos

## 3. NormsModule — esqueleto e testes (TDD)

- [x] 3.1 Escrever testes de integração para `GET /norms`, `POST /norms`, `PUT /norms/:id`, `DELETE /norms/:id` usando o skill `integration-test` — garantir que todos falham antes da implementação
- [x] 3.2 Criar `src/modules/norms/norms.module.ts`, `norms.controller.ts`, `norms.service.ts`
- [x] 3.3 Criar `src/modules/norms/dto/norm.dto.ts` com interfaces `NormRow`, `NormResponse`, `CreateNormDto`, `UpdateNormDto`
- [x] 3.4 Importar `NormsModule` no `AppModule`

## 4. NormsModule — implementação

- [x] 4.1 Implementar `NormsService.findAll()`: `SELECT * FROM company_norms ORDER BY code`
- [x] 4.2 Implementar `NormsService.create(dto)`: INSERT com conflito 23505 → 409
- [x] 4.3 Implementar `NormsService.update(id, dto)`: UPDATE de `description` e `severity`; ignora campo `code`; 404 se não encontrado
- [x] 4.4 Implementar `NormsService.delete(id)`: hard DELETE; 409 se violations referenciam a norma (FK violation code 23503); 404 se não encontrado
- [x] 4.5 Implementar `NormsController` com RoutePolicy: GET sem rba, POST/PUT/DELETE com `['minRank', 3]`
- [x] 4.6 Rodar testes de normas — garantir que passam

## 5. ViolationsModule — esqueleto e testes (TDD)

- [x] 5.1 Escrever testes de integração para `GET /violations/me`, `GET /violations`, `GET /violations/:id`, `POST /violations`, `DELETE /violations/:id` usando o skill `integration-test` — garantir que todos falham antes da implementação
- [x] 5.2 Criar `src/modules/violations/violations.module.ts`, `violations.controller.ts`, `violations.service.ts`
- [x] 5.3 Criar `src/modules/violations/dto/violation.dto.ts` com interfaces `ViolationRow`, `ViolationResponse`, `ViolationSummary`, `CreateViolationDto`
- [x] 5.4 Importar `ViolationsModule` no `AppModule`

## 6. ViolationsModule — helpers de autorização

- [x] 6.1 Implementar helper `canApplyViolation(caller, target)` no service: rank(caller) >= 3 → true; rank(caller) <= rank(target) → false; `getVisibleSectors(caller.sector, caller.role).includes(target.sector)`
- [x] 6.2 Implementar helper `canCancelViolation(caller, appliedByUser)` no service: rank(caller) >= 3 → true; caller.id === violation.applied_by → true; rank(caller) > rank(appliedByUser) → true
- [x] 6.3 Implementar `buildSummary(violations[])`: agrupa por severity, calcula score (1/2/6/18), at_risk = score >= 18

## 7. ViolationsModule — implementação

- [x] 7.1 Implementar `ViolationsService.findMine(callerId)`: retorna violations do caller (todos os status) com summary; omite applied_by
- [x] 7.2 Implementar `ViolationsService.findSubordinates(caller, userId?)`: resolve membros visíveis via hierarquia, aplica filtro de userId se presente, retorna por membro com violations e summary; 403 se userId fora da hierarquia
- [x] 7.3 Implementar `ViolationsService.findOne(id, caller)`: retorna violation completa com applied_by; valida acesso (dono ou superior)
- [x] 7.4 Implementar `ViolationsService.create(caller, dto)`: valida norma ativa, valida membro alvo ativo, valida `canApplyViolation`, insere violation com `expires_at = now() + interval '1 year'`, dispara `EmailService.sendViolationNotification(...)` em fire-and-forget
- [x] 7.5 Implementar `ViolationsService.cancel(id, caller)`: busca violation e applied_by user, valida `canCancelViolation`, 409 se já cancelada, seta `cancelled_at` e `cancelled_by`
- [x] 7.6 Implementar `ViolationsController` com rotas: `GET /violations/me`, `GET /violations`, `GET /violations/:id`, `POST /violations`, `DELETE /violations/:id` — RoutePolicy `authenticated` com `minRank: 1` para POST (consultores não podem aplicar)
- [x] 7.7 Rodar testes de violations — garantir que passam

## 8. Testes

### GET /norms
- [x] 8.1 `GET /norms` sem auth → 401
- [x] 8.2 `GET /norms` autenticado → lista normas ativas ordenadas por code
- [x] 8.3 `GET /norms` retorna todas as normas (sem filtro de status)

### POST /norms
- [x] 8.4 Consultor tenta criar norma → 403
- [x] 8.5 Presidente cria norma com body válido → 201
- [x] 8.6 Code duplicado → 409
- [x] 8.7 Body sem campo obrigatório → 400

### PUT /norms/:id
- [x] 8.8 Presidente edita description → 200 com norma atualizada
- [x] 8.9 ID inexistente → 404

### DELETE /norms/:id
- [x] 8.10 Presidente deleta norma sem violations → 204
- [x] 8.11 Norma com violations associadas → 409

### GET /violations/me
- [x] 8.12 Membro vê suas violations com summary (sem applied_by)
- [x] 8.13 Violations canceladas aparecem com status cancelled mas fora do score

### GET /violations
- [x] 8.14 Gerente comercial vê violations dos seus consultores
- [x] 8.15 Gerente de projetos não vê violations do comercial
- [x] 8.16 Presidente vê violations de todos
- [x] 8.17 `?userId=` de subordinado retorna violations + summary do membro
- [x] 8.18 `?userId=` de membro fora da hierarquia → 403

### GET /violations/:id
- [x] 8.19 Dono da violation vê detalhes com applied_by
- [x] 8.20 Superior hierárquico vê detalhes com applied_by
- [x] 8.21 Caller sem acesso → 403

### POST /violations
- [x] 8.22 Consultor tenta aplicar falta → 403
- [x] 8.23 Gerente aplica falta a subordinado do mesmo setor → 201
- [x] 8.24 Gerente tenta aplicar falta a subordinado de outro setor → 403
- [x] 8.25 Presidente aplica falta a qualquer membro → 201
- [x] 8.26 normId inexistente → 404
- [x] 8.27 userId de membro inativo → 404

### DELETE /violations/:id
- [x] 8.28 Aplicador cancela sua própria falta → 204
- [x] 8.29 Gerente tenta cancelar falta do presidente → 403
- [x] 8.30 Violation já cancelada → 409
- [x] 8.31 ID inexistente → 404

## 9. Documentação e Finalização

- [x] 9.1 Atualizar documentação da API (docs module) com os novos endpoints `/norms` e `/violations`
- [x] 9.2 Rodar `npm test` — todos os testes devem passar
- [x] 9.3 Verificar que não há erros de ESLint nos arquivos modificados/criados
- [x] 9.4 Verificar que `RESEND_API_KEY` está documentada no `.env.example`
