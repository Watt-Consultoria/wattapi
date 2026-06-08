## 1. Database

- [x] 1.1 Criar migration SQL com tabela `selection_processes` (id, title, starts_at, ends_at, created_at)
- [x] 1.2 Criar migration SQL com tabela `selection_process_applications` (id, selection_process_id FK, name, course, period INT CHECK > 0, phone, email, instagram, how_heard, motivation, why_watt, shirt_size, resume_path, transcript_path, photo_path, status DEFAULT 'pending', created_at) e UNIQUE(selection_process_id, email)
- [x] 1.3 Criar bucket `selection-process-files` via migration SQL ou Supabase Dashboard com `public = false`
- [x] 1.4 Configurar RLS no bucket: INSERT permitido para `anon`, SELECT/UPDATE/DELETE apenas para `service_role`

## 2. Testes (TDD — escrever antes da implementação)

- [x] 2.1 Criar `src/test/selection-process/POST-process.spec.ts` com cenários: criação bem-sucedida (201), range sobreposto (409), datas inválidas (400), sem permissão (403)
- [x] 2.2 Criar `src/test/selection-process/GET-process.spec.ts` com cenários: listagem de todos os processos (200)
- [x] 2.3 Criar `src/test/selection-process/POST-application.spec.ts` com cenários: submissão bem-sucedida (201), sem processo ativo (404), email duplicado (409), arquivo ausente no Storage (400), campo obrigatório ausente (400), period inválido (400), shirt_size inválido (400)
- [x] 2.4 Criar `src/test/selection-process/GET-applications.spec.ts` com cenários: listagem sem filtro retorna tudo (200), filtro por `selection_process_id` (200), processo filtrado não encontrado (404), lista vazia (200)
- [x] 2.5 Criar `src/test/selection-process/PATCH-application.spec.ts` com cenários: status atualizado (200), status inválido (400), candidatura não encontrada (404)
- [x] 2.6 Verificar que todos os testes falham (RED) antes de implementar

## 3. Módulo NestJS

- [x] 3.1 Criar estrutura do módulo: `src/modules/selection-process/selection-process.module.ts`, `selection-process.controller.ts`, `selection-process.service.ts`, `dto/selection-process.dto.ts`
- [x] 3.2 Implementar DTOs e schemas Zod: `createProcessSchema` (title, starts_at, ends_at), `createApplicationSchema` (todos os campos + validação de format de paths `{uuid}/{tipo}.{ext}`), `updateApplicationStatusSchema` (status enum)
- [x] 3.3 Implementar `SelectionProcessService.createProcess()` com validação de sobreposição de range
- [x] 3.4 Implementar `SelectionProcessService.findAll()` e `findActive()`
- [x] 3.5 Implementar `SelectionProcessService.createApplication()`: busca processo ativo, valida existência dos 3 arquivos no Storage (padrão reimbursements), trata unique violation como 409
- [x] 3.6 Implementar `SelectionProcessService.findApplications()` com geração de signed URLs (TTL 1h) para os 3 arquivos
- [x] 3.7 Implementar `SelectionProcessService.updateApplicationStatus()`
- [x] 3.8 Implementar `SelectionProcessController` com as rotas:
  - `POST /selection-process` — autenticado (assessor/presidente)
  - `GET /selection-process` — autenticado
  - `POST /selection-process/applications` — **unauthenticated**
  - `GET /selection-process/applications` — autenticado, query param opcional `selection_process_id`
  - `PATCH /selection-process/applications/:applicationId` — autenticado (assessor/presidente)
- [x] 3.9 Registrar `SelectionProcessModule` em `app.module.ts`

## 4. Verificação

- [x] 4.1 Rodar `npm test` e confirmar que todos os testes do módulo passam (GREEN)
- [x] 4.2 Verificar ausência de erros de lint: `npm run lint` nos arquivos modificados
- [x] 4.3 Atualizar `API.md` com documentação das 6 novas rotas (método, path, auth, request body, response)
