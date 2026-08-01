## 1. Validação de compatibilidade e setup

- [x] 1.1 Spike: instalar `nestjs-zod`, `@nestjs/swagger`, `swagger-ui-express` e confirmar compatibilidade com NestJS 11 + zod `^4.4.3` (montar um `DocumentBuilder` mínimo e subir a app localmente)
- [x] 1.2 Se incompatível, implementar `ZodValidationPipe` caseiro (fallback descrito na Decisão 1/Risco 2 do `design.md`) mantendo o mesmo padrão de DTO — **N/A**: spike confirmou compatibilidade total, fallback não necessário
- [x] 1.3 Adicionar `nestjs-zod`, `@nestjs/swagger`, `swagger-ui-express` ao `package.json`

## 2. TDD — comportamento observável antes da implementação

- [x] 2.1 Escrever teste de integração para `GET /docs` esperando Swagger UI (não o HTML atual renderizado de `API.md`) — confirmar que **FALHA** antes de qualquer implementação (`src/test/docs/GET.spec.ts` — confirmado FALHA)
- [x] 2.2 Escrever teste de integração para `POST /users` com body inválido esperando 400 com `{formErrors, fieldErrors}` idêntico ao formato atual — confirmar que ainda passa com a implementação atual (baseline), depois usar como regressão durante a migração do pipe (`src/test/users/POST.spec.ts` — confirmado PASSA)
- [x] 2.3 Escrever teste (unitário ou script) esperando que `openapi.json` exista na raiz e seja um documento OpenAPI válido — confirmar que **FALHA** (arquivo ainda não existe) (`src/test/docs/openapi-artifact.spec.ts` — confirmado FALHA)

## 3. Pipeline de validação global

- [x] 3.1 Implementar `ZodValidationPipe` global (via `nestjs-zod` ou fallback) com `exceptionFactory` que reproduz `result.error.flatten()` + `BadRequestException`, preservando o formato de erro 400 atual (`src/common/pipes/zod-validation.pipe.ts`)
- [x] 3.2 Registrar o pipe globalmente em `src/main.ts`
- [x] 3.3 Confirmar que o teste da tarefa 2.2 continua passando com o novo pipe (61/61 testes de `users` passando)

## 4. Migração módulo por módulo (DTOs de request + schemas de resposta)

Para cada módulo: converter os schemas zod de request existentes em DTOs via `createZodDto`; trocar `@Body() body: unknown` pela DTO tipada nos handlers; remover o `safeParse` manual correspondente (validação passa a ser feita pelo pipe global); criar schemas zod de resposta via `createZodDto` substituindo as `interface`/`type` soltas hoje usadas; marcar campos afetados por `RoutePolicy.output` (ex: `cpf` em `users`) como opcionais/nullable com `description` explicando a condição real; rodar a suíte de testes do módulo e confirmar que passa sem alteração de comportamento observável.

- [x] 4.1 Migrar `activities`
- [x] 4.2 Migrar `auth`
- [x] 4.3 Migrar `email`
- [x] 4.4 Migrar `gamification`
- [x] 4.5 Migrar `houses`
- [x] 4.6 Migrar `internal`
- [x] 4.7 Migrar `leads`
- [x] 4.8 Migrar `norms`
- [x] 4.9 Migrar `notifications`
- [x] 4.10 Migrar `portfolio`
- [x] 4.11 Migrar `push-subscriptions`
- [x] 4.12 Migrar `reimbursements`
- [x] 4.13 Migrar `routine`
- [x] 4.14 Migrar `selection-process`
- [x] 4.15 Migrar `settings`
- [x] 4.16 Migrar `status`
- [x] 4.17 Migrar `time-tracking`
- [x] 4.18 Migrar `users` (referência: `create-user`/`update-user`/`role-hierarchy` specs — atenção especial ao campo `cpf` com output policy)
- [x] 4.19 Migrar `violations`

## 5. Transform de descrição de autorização (RoutePolicy → OpenAPI)

- [x] 5.1 Implementar função que descobre todas as rotas via `DiscoveryService` e lê o metadata `ROUTE_POLICY_KEY` de cada handler (mesma chave lida por `RoutePolicyGuard`) (`src/common/openapi/apply-route-policy-descriptions.ts` — casado via `operationId`, não por path+method reconstruído)
- [x] 5.2 Implementar geração de texto descritivo a partir de `AccessPolicy` (`mode` + `rba`) — ex: "Requer autenticação. Restrito aos roles: assessor, presidente." (`src/common/openapi/describe-access-policy.ts`)
- [x] 5.3 Implementar pós-processamento do `OpenAPIObject` (retorno de `SwaggerModule.createDocument`) injetando o texto gerado na `description` da operation correspondente, casando por `path` + método HTTP
- [x] 5.4 Escrever testes unitários do transform cobrindo: `mode: 'unauthenticated'`, `mode: 'unexistent'`, `mode: 'authenticated'` sem `rba`, e `mode: 'authenticated'` com `rba` (`role`, `sector`, `role AND sector`) (`describe-access-policy.spec.ts` — 7/7 passando)

## 6. Bootstrap do Swagger

- [x] 6.1 Configurar `DocumentBuilder` com título, descrição, versão e `.addBearerAuth()`
- [x] 6.2 Extrair a construção do documento (DocumentBuilder + `createDocument` + transform de RBAC da seção 5) para uma função compartilhada (ex: `src/common/openapi/build-document.ts`), reutilizável pelo bootstrap e pelo script de export estático
- [x] 6.3 Chamar `SwaggerModule.setup('docs', app, document)` em `src/main.ts`, substituindo a montagem do `DocsModule` atual
- [x] 6.4 Confirmar que o teste da tarefa 2.1 passa (confirmado: `GET /docs` retorna Swagger UI)

## 7. Export estático e checagem de CI

- [x] 7.1 Implementar `src/common/scripts/generate-openapi.ts`: instancia a app via `NestFactory.create` (sem `app.listen()`), usa a função compartilhada da tarefa 6.2, escreve `openapi.json` formatado na raiz do projeto
- [x] 7.2 Adicionar script `docs:generate` ao `package.json`
- [x] 7.3 Rodar `docs:generate` e commitar o primeiro `openapi.json` — arquivo gerado e presente na raiz do projeto; commit fica a critério do usuário (não commitado automaticamente nesta sessão)
- [x] 7.4 Implementar script `docs:check`: gera o documento num diretório temporário e compara (deep-equal) contra o `openapi.json` commitado, saindo com código diferente de zero se divergente
- [x] 7.5 Adicionar `docs:check` ao workflow de CI existente em `.github/` num novo job (`.github/workflows/linting.yaml`)
- [x] 7.6 Adicionar `docs:check` como pre-push hook (não pre-commit) para evitar divergência local do `openapi.json` commitado
- [x] 7.7 Confirmar que o teste da tarefa 2.3 passa

## 8. Remoção do mecanismo antigo

- [x] 8.1 Remover `DocsController`/`DocsModule` atuais (leitura de `API.md` via `marked`) e sua importação em `app.module.ts`
- [x] 8.2 Remover `API.md` da raiz do projeto
- [x] 8.3 Remover a dependência `marked` do `package.json`

## 9. Testing

Usar o skill `./claude/skills/integration-test` para os testes de integração desta seção.

- [x] 9.1 Escrever/atualizar testes de integração cobrindo:
  - `GET /docs` sem token → 200, `Content-Type: text/html`, corpo contém marcação do Swagger UI (não o conteúdo antigo de `API.md`) — `src/test/docs/GET.spec.ts`
  - Endpoint que serve o JSON do documento OpenAPI (ex: `GET /docs-json`, path padrão do `SwaggerModule.setup`) → 200, JSON válido, contém `paths` para rotas conhecidas (ex: `/users`, `/auth/me`) — `src/test/docs/GET.spec.ts`
  - `POST /users` com body inválido → 400 com `{formErrors, fieldErrors}` no mesmo formato de antes da migração — `src/test/users/POST.spec.ts`
  - `POST /users` com body válido → 201, mesmo shape de resposta de antes — já coberto (teste pré-existente, `src/test/users/POST.spec.ts`)
  - `DELETE /users/:user_id` (rota com `rba` restrito a `assessor`/`presidente`) → a `description` da operation correspondente no documento OpenAPI gerado menciona a restrição de role — `src/test/docs/GET.spec.ts`
  - `GET /users/:user_id` chamado por caller de rank baixo consultando outro usuário → resposta 200 sem o campo `cpf`, consistente com `RoleSerializerInterceptor` (comportamento inalterado) — já coberto (teste pré-existente, `src/test/users/GET.spec.ts`)
- [x] 9.2 Confirmar que os testes existentes dos 19 módulos continuam passando após a migração completa, sem regressão de comportamento observável (730/733 — 2 eram os testes TDD-red de `/docs`/`openapi.json` agora verdes, 1 falha pré-existente e não relacionada em `selection-process/interviews/POST.spec.ts` — data hardcoded "futura" que o calendário real já ultrapassou, não é regressão desta migração)

## 10. Verificação final

- [x] 10.1 Rodar `npm run lint` (oxlint + `prettier --check`) e confirmar zero erros nos arquivos modificados (oxlint limpo; prettier limpo em todos os arquivos desta mudança — os ~51 warnings restantes são de arquivos pré-existentes não tocados por este change)
- [x] 10.2 Rodar `npm test` e confirmar que todos os testes passam (743/744 — única falha é pré-existente e não relacionada, ver nota na tarefa 9.2)
- [x] 10.3 Rodar `npm run docs:check` e confirmar que passa (`openapi.json` sincronizado com o código)
- [x] 10.4 Verificar manualmente que `GET /docs` abre o Swagger UI no navegador e que "try it out" funciona numa rota autenticada com um Bearer token válido — verificado via browser automation; encontrou e corrigiu um bug real: `.addBearerAuth()` só registra o scheme, cada operation precisa de `security: [{bearer: []}]` para o "try it out" anexar o token — corrigido em `apply-route-policy-descriptions.ts` a partir do mesmo metadata de `RoutePolicy` (mode !== 'unauthenticated')
- [x] 10.5 Confirmar que nenhum arquivo do projeto (código ou config) ainda referencia `API.md` ou `marked`
