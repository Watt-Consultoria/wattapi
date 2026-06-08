## Why

O processo seletivo da Watt já recebe candidaturas via API, mas não existe uma forma estruturada de conduzir os candidatos aprovados ao longo das etapas do processo. Hoje a aprovação de uma candidatura é apenas uma atualização de campo — nenhum candidato é criado, nenhum email é enviado, nenhuma etapa é registrada.

## What Changes

- Novo endpoint `POST /selection-process/stages` para criação de etapas de um processo seletivo
- Novo endpoint `GET /selection-process/stages` para listagem de etapas (filtrado por processo)
- Novo endpoint `GET /selection-process/candidates` para listagem de candidatos (filtrado por processo e/ou etapa)
- Novo endpoint `PATCH /selection-process/candidates/:id` para avançar ou eliminar um candidato
- `PATCH /selection-process/applications/:id` com `status: "approved"` passa a ter side-effects: cria candidato na etapa 1 e envia email de aprovação com nome da etapa
- `PATCH /selection-process/applications/:id` com `status: "reproved"` passa a enviar email de rejeição ao candidato
- 5 novos templates de email: aprovação na candidatura, rejeição na candidatura, avanço de etapa, aprovação final, eliminação em etapa
- 2 novas migrações SQL: `selection_process_stages` e `candidates`

## Capabilities

### New Capabilities

- `selection-process-stages`: CRUD de etapas de um processo seletivo com posição ordenada; etapas devem existir antes das aprovações de candidaturas
- `selection-process-candidates`: Criação automática de candidato ao aprovar candidatura, avanço automático entre etapas por posição, eliminação e aprovação final; todos os eventos disparam email ao candidato

### Modified Capabilities

- `selection-process-applications`: O comportamento do PATCH com `status: "approved"` e `"reproved"` muda — passa a ter side-effects (criação de candidato + envio de email)

## Impact

- `src/modules/selection-process/selection-process.service.ts` — extensão com lógica de stages e candidates
- `src/modules/selection-process/selection-process.controller.ts` — 4 novos endpoints
- `src/modules/selection-process/dto/selection-process.dto.ts` — novos tipos e schemas Zod
- `src/common/email/` — 5 novos arquivos de template de email
- `src/database/supabase/migrations/` — 2 novas migrações
- `src/test/selection-process/` — novos testes de integração para stages e candidates
