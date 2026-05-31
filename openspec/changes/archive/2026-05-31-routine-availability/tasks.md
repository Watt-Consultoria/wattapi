## 1. Banco de dados

- [x] 1.1 Criar migration `create-routine-slots-table.sql` com tabela `routine_slots (user_id uuid FK, day smallint 0–6, hour smallint 8–21, PK (user_id, day, hour))`
- [x] 1.2 Aplicar a migration no ambiente local (`supabase db reset` ou `supabase migration up`)

## 2. Testes (TDD — escrever antes da implementação)

- [x] 2.1 Criar `src/modules/routine/routine.service.spec.ts` com testes para `PUT /routine`: payload válido persiste slots corretos, payload inválido (dia faltando, array errado) lança exceção
- [x] 2.2 Adicionar testes para `GET /routine`: retorna grade booleana quando rotina existe, retorna `null` quando não existe
- [x] 2.3 Adicionar testes para `GET /routine/:userId`: autoriza gerente → consultor mesmo setor, nega gerente → consultor outro setor, nega consultor → outro consultor, autoriza assessor → diretor qualquer setor, autoriza self via `:userId`, retorna 404 para target inexistente
- [x] 2.4 Adicionar testes para `GET /routine/summary`: retorna sumário correto para gerente (apenas consultores mesmo setor), retorna objeto vazio quando nenhum subordinado tem rotina, nega consultor com 403
- [x] 2.5 Confirmar que todos os testes falham com `npm test` antes de implementar

## 3. Módulo

- [x] 3.1 Criar `src/modules/routine/routine.module.ts` importando `DatabaseModule` e `UsersModule`
- [x] 3.2 Criar `src/modules/routine/routine.service.ts` com classe vazia
- [x] 3.3 Criar `src/modules/routine/routine.controller.ts` com classe vazia
- [x] 3.4 Criar `src/modules/routine/dto/routine.dto.ts` com schema Zod para validação do payload de `PUT /routine` (objeto com 7 chaves de dia, cada uma array de 14 booleanos)
- [x] 3.5 Registrar `RoutineModule` em `src/app.module.ts`

## 4. Service — helpers

- [x] 4.1 Implementar helper `slotsToDb(userId, slots)` que converte o objeto `{ mon: [bool×14], ... }` para array de `(day, hour)` pares onde `value === true`
- [x] 4.2 Implementar helper `dbToSlots(rows)` que converte array de `(day, hour)` rows para objeto `{ mon: [bool×14], ... }`
- [x] 4.3 Implementar helper `canView(viewer, target)` com a regra hierárquica: self → true; rank superior + superuser (rank >= 3) → true; rank superior + mesmo setor → true; demais → false
- [x] 4.4 Implementar helper `buildSubordinatesFilter(viewer)` que retorna o filtro SQL de roles e setor para o sumário (roles permitidos por rank do caller e restrição de setor quando rank < 3)

## 5. Service — endpoints

- [x] 5.1 Implementar `upsertRoutine(userId, slots)`: transação DELETE + INSERT em batch dos slots disponíveis
- [x] 5.2 Implementar `getOwnRoutine(userId)`: retorna `{ slots }` ou `{ slots: null }` se nenhuma linha encontrada
- [x] 5.3 Implementar `getRoutineByUserId(viewerId, targetId)`: busca target user, aplica `canView`, busca rotina do target; lança 403 se negado, 404 se target não existe
- [x] 5.4 Implementar `getSummary(viewer)`: executa query com JOIN em `routine_slots` + `users` filtrando pelos subordinados do caller; agrega resultado em `{ day: { hour: [users] } }` omitindo slots vazios

## 6. Controller

- [x] 6.1 Declarar `PUT /routine` com `@RoutePolicy({ access: { mode: 'authenticated' } })`, validar body com schema Zod, chamar `upsertRoutine`
- [x] 6.2 Declarar `GET /routine` com `@RoutePolicy({ access: { mode: 'authenticated' } })`, chamar `getOwnRoutine`
- [x] 6.3 Declarar `GET /routine/summary` **antes** de `GET /routine/:userId` no controller (evitar conflito de roteamento NestJS), com `@RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 1]] } })`, chamar `getSummary`
- [x] 6.4 Declarar `GET /routine/:userId` com `@RoutePolicy({ access: { mode: 'authenticated' } })`, chamar `getRoutineByUserId`

## 7. Testes

- [x] 7.1 Executar `npm test` e confirmar que todos os testes do `routine.service.spec.ts` passam
- [x] 7.2 Verificar manualmente os 4 endpoints via HTTP client (PUT salva, GET retorna, GET/:userId respeita visibilidade, GET/summary agrega corretamente)

## 8. Documentação

- [x] 8.1 Adicionar os 4 novos endpoints ao arquivo de documentação da API (`src/modules/docs/` ou equivalente), incluindo shape de request/response e regras de acesso

## 9. Finalização

- [x] 9.1 Executar `npm run lint` nos arquivos modificados e corrigir eventuais erros de lint
- [x] 9.2 Executar `npm test` e confirmar que todos os testes da suite passam sem erros
