## 1. Database Migration

- [x] 1.1 Criar enum `activity_priority` ('alta', 'media', 'baixa') no Supabase
- [x] 1.2 Criar tabela `activities` com campos: id, user_id (FK users.id), name, description, date, time_start, time_end, priority, created_at, updated_at — com CHECK `time_end > time_start`
- [x] 1.3 Criar índices: `idx_activities_user_id` e `idx_activities_date`

## 2. Remoção do Swagger

- [x] 2.1 Remover `DocumentBuilder`, `SwaggerModule.createDocument`, `SwaggerModule.setup` e imports de `@nestjs/swagger` de `src/main.ts`
- [x] 2.2 Remover todos os decorators `@Api*` e imports de `@nestjs/swagger` de `src/modules/auth/auth.controller.ts`
- [x] 2.3 Remover todos os decorators `@Api*`, imports de `@nestjs/swagger` e classes `*Schema` com `@ApiProperty` de `src/modules/users/users.controller.ts` e `src/modules/users/dto/create-user.dto.ts`
- [x] 2.4 Remover todos os decorators `@Api*`, imports de `@nestjs/swagger` e classes `*Schema` com `@ApiProperty` de `src/modules/settings/settings.controller.ts` e `src/modules/settings/dto/settings.dto.ts`
- [x] 2.5 Remover todos os decorators `@Api*`, imports de `@nestjs/swagger` e classes `*Schema` com `@ApiProperty` de `src/modules/time-tracking/time-tracking.controller.ts` e `src/modules/time-tracking/dto/time-tracking.dto.ts`
- [x] 2.6 Remover todos os decorators `@Api*` e imports de `@nestjs/swagger` de `src/modules/status/status.controller.ts`
- [x] 2.7 Remover `@nestjs/swagger` e `swagger-ui-express` do `package.json` e rodar `npm install`

## 3. Módulo de Documentação (`/docs`)

- [x] 3.1 Criar `src/modules/docs/docs.controller.ts` com `GET /docs` público (sem guard): lê `API.md` da raiz, renderiza com `marked`, retorna HTML com `Content-Type: text/html` e estilo básico inline
- [x] 3.2 Criar `src/modules/docs/docs.module.ts` e registrar `DocsController`
- [x] 3.3 Instalar `marked` via `npm install marked`
- [x] 3.4 Importar `DocsModule` em `src/app.module.ts`

## 4. Arquivo `API.md`

- [x] 4.1 Criar `API.md` na raiz do projeto documentando todos os grupos de rotas: Auth, Users, Settings, Time Entries, Activities, Status — para cada rota: método, path, autenticação, restrições de role, body, query params e respostas possíveis

## 5. Módulo `activities` — estrutura e testes (TDD)

- [x] 5.1 Criar estrutura de diretório `src/modules/activities/` com `activities.module.ts`, `activities.controller.ts`, `activities.service.ts`, `dto/activity.dto.ts`
- [x] 5.2 Escrever testes unitários em `activities.service.spec.ts` cobrindo: criação de atividade, listagem com visibilidade por role/setor, filtros de data, edição apenas pelo dono (403 para não-dono), deleção apenas pelo dono (403 para não-dono), 404 para IDs inexistentes — confirmar que todos os testes FALHAM antes da implementação

## 6. Módulo `activities` — implementação

- [x] 6.1 Implementar interface `ActivityRow` e `ActivityResponse` em `dto/activity.dto.ts` com validação Zod para `CreateActivityDto` e `UpdateActivityDto`
- [x] 6.2 Implementar `ActivitiesService.create(userId, dto)` — INSERT na tabela `activities`
- [x] 6.3 Implementar `ActivitiesService.findAll(requesterId, requesterRank, requesterSector, filters)` — query com visibilidade por CASE + filtros de data opcionais
- [x] 6.4 Implementar `ActivitiesService.update(id, requesterId, dto)` — verifica `user_id = requesterId` antes de UPDATE, lança 403 se não for dono, 404 se não encontrado
- [x] 6.5 Implementar `ActivitiesService.remove(id, requesterId)` — verifica `user_id = requesterId` antes de DELETE, lança 403 se não for dono, 404 se não encontrado
- [x] 6.6 Implementar `ActivitiesController` com rotas: `POST /activities`, `GET /activities` (com query params `date`, `from`, `to`), `PATCH /activities/:id`, `DELETE /activities/:id` — todas com `@RoutePolicy({ access: { mode: 'authenticated' } })`
- [x] 6.7 Importar `ActivitiesModule` em `src/app.module.ts`

## 7. Testing

- [x] 7.1 Confirmar que todos os testes unitários do `activities.service.spec.ts` passam após implementação
- [x] 7.2 Escrever testes do controller em `activities.controller.spec.ts` cobrindo: POST, GET com e sem filtros, PATCH, DELETE
- [x] 7.3 Verificar que os testes existentes dos outros módulos não foram afetados pela remoção do Swagger

## 8. Verificação Final

- [x] 8.1 Rodar `npm test` — 214 testes, 12 suites, zero falhas
- [x] 8.2 Verificar que `GET /docs` retorna HTML com o conteúdo do `API.md` renderizado
- [x] 8.3 Verificar que não há erros de lint nos arquivos modificados
- [x] 8.4 Confirmar que `@nestjs/swagger` não está mais importado em nenhum arquivo do `src/`
