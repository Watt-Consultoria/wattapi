## 1. TDD — Testes de integração (devem falhar antes da implementação)

- [x] 1.1 Criar testes de integração para `GET /portfolio`, `POST /portfolio`, `PATCH /portfolio/:id` e `DELETE /portfolio/:id` usando o skill `integration-test` — verificar que todos falham com 404
- [x] 1.2 Criar testes de integração para `GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id` e `DELETE /leads/:id` — verificar que todos falham com 404
- [x] 1.3 Criar testes de integração para `POST /leads/:id/contacts`, `PATCH /leads/:id/contacts/:contact_id` e `DELETE /leads/:id/contacts/:contact_id` — verificar que todos falham com 404
- [x] 1.4 Criar testes de integração para `POST /leads/:id/comments`, `PATCH /leads/:id/comments/:comment_id` e `DELETE /leads/:id/comments/:comment_id` — verificar que todos falham com 404

## 2. Banco de dados — Migration

- [x] 2.1 Criar migration SQL com tabela `portfolio_items` (`id`, `name TEXT NOT NULL UNIQUE`, `description`, `created_at`, `updated_at`)
- [x] 2.2 Criar migration SQL com tabela `leads` (`id`, `company_name`, `created_by → users`, `status CHECK`, campos `address_*`, `interest_items TEXT[]  DEFAULT '{}'`, `created_at`, `updated_at`)
- [x] 2.3 Criar migration SQL com tabela `lead_contacts` (`id`, `lead_id → leads CASCADE`, `name`, `role`, `email`, `phone`, `CHECK email OR phone`)
- [x] 2.4 Criar migration SQL com tabela `lead_comments` (`id`, `lead_id → leads CASCADE`, `user_id → users`, `content`, `created_at`, `updated_at`)
- [x] 2.5 Aplicar migration no banco de desenvolvimento e verificar criação das 4 tabelas

## 3. RBA — Nova condição `roleAndSector`

- [x] 3.1 Adicionar `['roleAndSector', { roles: string[]; sectors: string[] }]` ao tipo `RbaCondition` em `src/common/decorators/route-policy.decorator.ts`
- [x] 3.2 Implementar avaliação da condição `roleAndSector` no método `evaluateRba` de `src/common/guards/route-policy.guard.ts` (lógica AND: `roles.includes(caller.role) && sectors.includes(caller.sector)`)
- [x] 3.3 Verificar que os testes de integração existentes (para outras rotas com RBA) continuam passando

## 4. Módulo Portfolio

- [x] 4.1 Criar estrutura `src/modules/portfolio/` com `portfolio.module.ts`, `portfolio.controller.ts`, `portfolio.service.ts` e `dto/portfolio.dto.ts`
- [x] 4.2 Definir schema Zod para `CreatePortfolioItemDto` (`name` obrigatório, `description` opcional) e `UpdatePortfolioItemDto` (ambos opcionais, ao menos um)
- [x] 4.3 Implementar `GET /portfolio` — query `SELECT * FROM portfolio_items ORDER BY name` — política: autenticado sem RBA
- [x] 4.4 Implementar `POST /portfolio` — inserir e retornar o item; tratar violação de `UNIQUE` em `name` como 409 — política: `['minRank', 2]`
- [x] 4.5 Implementar `PATCH /portfolio/:id` — update parcial; retornar 404 se não encontrado — política: `['minRank', 2]`
- [x] 4.6 Implementar `DELETE /portfolio/:id` — hard delete; retornar 404 se não encontrado; retornar 204 — política: `['minRank', 2]`
- [x] 4.7 Registrar `PortfolioModule` em `app.module.ts`

## 5. Módulo Leads — CRUD principal

- [x] 5.1 Criar estrutura `src/modules/leads/` com `leads.module.ts`, `leads.controller.ts`, `leads.service.ts` e `dto/lead.dto.ts`
- [x] 5.2 Definir schema Zod para `CreateLeadDto` (`company_name`, campos `address_*` obrigatórios exceto `complemento`, `status` opcional, `interest_items: string[]` opcional) e `UpdateLeadDto` (todos opcionais)
- [x] 5.3 Implementar `GET /leads` — retornar todos os leads com campos principais incluindo `interest_items` — política: `rba: [['minRank', 3], ['sector', 'comercial'], ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]`
- [x] 5.4 Implementar `POST /leads` — se `interest_items` fornecido, validar cada nome via `SELECT name FROM portfolio_items WHERE name = ANY($1) AND deleted_at IS NULL` e retornar 400 se algum não encontrado; inserir lead; `created_by` = `req.jwtData.sub`
- [x] 5.5 Implementar `GET /leads/:id` — retornar lead completo com `contacts[]`, `interest_items` e `comments[]` (ORDER BY `created_at ASC`) via JOINs; retornar 404 se não encontrado
- [x] 5.6 Implementar `PATCH /leads/:id` — update parcial do lead; se `interest_items` presente, validar nomes contra portfólio ativo e substituir o array completo
- [x] 5.7 Implementar `DELETE /leads/:id` — verificar no service: `caller.id === lead.created_by OR isSuperuser(caller.role)`; retornar 403 se não autorizado; 404 se não encontrado; 204 se sucesso
- [x] 5.8 Registrar `LeadsModule` em `app.module.ts`

## 6. Sub-resource Contacts

- [x] 6.1 Adicionar endpoints de contatos ao `leads.controller.ts`: `POST /leads/:id/contacts`, `PATCH /leads/:id/contacts/:contact_id`, `DELETE /leads/:id/contacts/:contact_id`
- [x] 6.2 Definir schema Zod `CreateContactDto` (`name`, `role`, `email?`, `phone?`) com refinement: `email OR phone obrigatório`
- [x] 6.3 Implementar `POST /leads/:id/contacts` — verificar que o lead existe (404); inserir e retornar o contato
- [x] 6.4 Implementar `PATCH /leads/:id/contacts/:contact_id` — update parcial; verificar que após o update a constraint `email OR phone` é mantida (retornar 400 se violada); retornar 404 se não encontrado ou não pertence ao lead
- [x] 6.5 Implementar `DELETE /leads/:id/contacts/:contact_id` — verificar que pertence ao lead (404); retornar 204

## 7. Sub-resource Comments

- [x] 7.1 Adicionar endpoints de comentários ao `leads.controller.ts`: `POST /leads/:id/comments`, `PATCH /leads/:id/comments/:comment_id`, `DELETE /leads/:id/comments/:comment_id`
- [x] 7.2 Definir schema Zod `CreateCommentDto` (`content: string não vazio`) e `UpdateCommentDto` (`content`)
- [x] 7.3 Implementar `POST /leads/:id/comments` — verificar lead (404); inserir com `user_id = caller.id`; retornar 201 com comentário
- [x] 7.4 Implementar `PATCH /leads/:id/comments/:comment_id` — verificar que `caller.id === comment.user_id` (403); atualizar `content` e `updated_at`; retornar 404 se não encontrado
- [x] 7.5 Implementar `DELETE /leads/:id/comments/:comment_id` — buscar comentário + role do criador; verificar `caller.id === comment.user_id OR getRank(caller.role) > getRank(creator.role)` (403); retornar 204

## 8. Documentação da API

- [x] 8.1 Atualizar `API.md` com as rotas de `/portfolio` (4 endpoints), `/leads` (5 endpoints), `/leads/:id/contacts` (3 endpoints) e `/leads/:id/comments` (3 endpoints), incluindo request/response shapes e regras de acesso

## 9. Verificação final

- [x] 9.1 Verificar que todos os testes de integração criados no passo 1 passam com `npm test`
- [x] 9.2 Verificar ausência de erros de ESLint nos arquivos modificados e criados
