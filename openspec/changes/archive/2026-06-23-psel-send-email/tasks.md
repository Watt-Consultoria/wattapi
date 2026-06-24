## 1. Test (TDD — escrever antes da implementação)

- [x] 1.1 Criar `src/test/selection-process/send-email/POST.spec.ts` com os seguintes cenários (todos devem falhar nesta etapa):
  - Envio bem-sucedido para todos os candidatos → 200 `{ successes: N, errors: 0 }`
  - Falha parcial de envio → 200 `{ successes: S, errors: E }`
  - ID de candidato inexistente → 404
  - Corpo incompleto (campo faltando) → 400
  - Acesso sem permissão (role consultor) → 403

## 2. DTO

- [x] 2.1 Adicionar schema Zod `sendEmailToCandidatesSchema` em `selection-process.dto.ts` com campos: `candidate_ids` (array de UUID, min 1), `subject` (string não vazia), `html` (string não vazia), `plain_text` (string não vazia)
- [x] 2.2 Adicionar tipo `SendEmailToCandidatesDto` e `SendEmailResult` (`{ successes: number; errors: number }`) em `selection-process.dto.ts`

## 3. Service

- [x] 3.1 Implementar `sendEmailToCandidates(dto)` em `selection-process.service.ts`:
  - Buscar todos os candidatos pelos IDs; lançar `NotFoundException` se qualquer ID não existir
  - Usar `Promise.allSettled` para enviar os emails em paralelo via `EmailService.send`
  - Contar fulfilled vs rejected e retornar `{ successes, errors }`

## 4. Controller

- [x] 4.1 Adicionar rota `POST /selection-process/send-email` em `selection-process.controller.ts`:
  - Acesso `ADMIN_ACCESS` (`assessor` / `presidente`)
  - Validar body com `sendEmailToCandidatesSchema`
  - Delegar para `service.sendEmailToCandidates`
  - Retornar HTTP 200

## 5. Documentação

- [x] 5.1 Atualizar `API.md` com a nova rota `POST /selection-process/send-email`: método, acesso, body, response e exemplo

## 6. Finalização

- [x] 6.1 Rodar `npm test` e confirmar que todos os testes passam (incluindo os novos)
- [x] 6.2 Verificar ausência de erros de lint nos arquivos modificados
