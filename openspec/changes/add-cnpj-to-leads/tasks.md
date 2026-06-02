## 1. Testes (TDD — escrever antes da implementação)

- [x] 1.1 Atualizar `validPayload` em todos os specs de `/leads` para incluir `cnpj: '12.345.678/0001-95'` — os testes devem falhar antes da implementação
- [x] 1.2 Adicionar cenário em `POST.spec.ts`: criação sem `cnpj` retorna 400
- [x] 1.3 Adicionar cenário em `POST.spec.ts`: criação com `cnpj` em formato inválido (`"12345678000195"`) retorna 400
- [x] 1.4b Adicionar cenário em `POST.spec.ts`: criação com `cnpj` formatado mas dígitos verificadores inválidos (`"11.111.111/1111-11"`) retorna 400
- [x] 1.4 Adicionar cenário em `PATCH.spec.ts`: atualização com `cnpj` válido retorna 200 e inclui o novo CNPJ no body
- [x] 1.5 Adicionar cenário em `PATCH.spec.ts`: atualização com `cnpj` inválido retorna 400
- [x] 1.6 Verificar que `GET.spec.ts` valida presença de `cnpj` no body de resposta
- [x] 1.7 Verificar que specs de sub-rotas (`contacts/`, `comments/`) com `createLead` no orchestrator incluem `cnpj` (ajustar helper se necessário)

## 2. Database

- [x] 2.1 Criar migration SQL em `src/database/migrations/` adicionando coluna `cnpj VARCHAR(18) NOT NULL DEFAULT '00.000.000/0000-00'` à tabela `leads`
- [x] 2.2 Adicionar instrução para remover o DEFAULT após inserção: `ALTER TABLE leads ALTER COLUMN cnpj DROP DEFAULT`
- [x] 2.3 Atualizar seed helper (`src/lib/seed.ts` ou equivalente) para incluir `cnpj` ao criar leads nos testes

## 3. Backend — DTO e Validação

- [x] 3.1 Implementar função `isValidCnpj(cnpj: string): boolean` com validação de formato e dígitos verificadores (algoritmo da Receita Federal) em `src/modules/leads/dto/lead.dto.ts` ou utilitário separado
- [x] 3.2 Adicionar campo `cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido')` como obrigatório em `createLeadSchema`
- [x] 3.3b Adicionar campo `cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido').optional()` em `updateLeadSchema`
- [x] 3.3 Adicionar `cnpj: string` nas interfaces `LeadRow` e `LeadResponse`

## 4. Backend — Service e Controller

- [x] 4.1 Atualizar `leads.service.ts`: incluir `cnpj` no INSERT ao criar lead
- [x] 4.2 Atualizar `leads.service.ts`: incluir `cnpj` no UPDATE ao atualizar lead (quando fornecido)
- [x] 4.3 Verificar que `GET /leads` e `GET /leads/:id` já retornam todos os campos da tabela (incluindo `cnpj`) — ajustar SELECT se necessário

## 5. Documentação OpenAPI — Rotas `/leads`

- [x] 5.1 Adicionar `@ApiProperty` ou comentário JSDoc com descrição, exemplo e formato para o campo `cnpj` no DTO/schema
- [x] 5.2 Documentar `POST /leads`: descrição da rota, campos obrigatórios, exemplo de request/response, códigos HTTP (201, 400, 401, 403)
- [x] 5.3 Documentar `GET /leads`: descrição, exemplo de response com array de leads incluindo `cnpj`, código HTTP 200
- [x] 5.4 Documentar `GET /leads/:id`: descrição, exemplo completo com `contacts`, `comments`, `cnpj`
- [x] 5.5 Documentar `PATCH /leads/:id`: campos aceitos, validações, exemplo de request/response
- [x] 5.6 Documentar `DELETE /leads/:id`: regras de acesso (criador ou superuser), código 204/403/404
- [x] 5.7 Documentar sub-rotas de contatos (`POST`, `PATCH`, `DELETE /leads/:id/contacts/:contact_id`) com exemplos
- [x] 5.8 Documentar sub-rotas de comentários (`POST`, `PATCH`, `DELETE /leads/:id/comments/:comment_id`) com exemplos

## 6. Documentação OpenAPI — Rotas `/portfolio`

- [x] 6.1 Documentar `GET /portfolio`: descrição, exemplo de response com array de items, código 200
- [x] 6.2 Documentar `POST /portfolio`: campos obrigatórios (`name`), exemplo de request/response, código 201/400/401/403
- [x] 6.3 Documentar `PATCH /portfolio/:id`: campos aceitos, exemplo de request/response, código 200/400/404
- [x] 6.4 Documentar `DELETE /portfolio/:id`: soft delete ou hard delete, código 204/403/404

## 7. Verificação Final

- [x] 7.1 Executar `npm test` e garantir que todos os testes passam
- [x] 7.2 Verificar que não há erros de lint nos arquivos modificados
- [x] 7.3 Confirmar via endpoint `/docs` (Swagger UI) que a documentação das rotas `/leads` e `/portfolio` está correta e completa
