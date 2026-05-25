## 1. Testes (TDD — RED primeiro)

- [x] 1.1 Escrever testes para `TimeTrackingService.getWeeklySummaryList()`: verificar que retorna todos os usuários ativos com `total_minutes` correto, `min_hours_met` calculado com base em `min_week_hours`, e que usuários sem sessões na semana aparecem com `total_minutes: 0`
- [x] 1.2 Escrever testes para o campo `min_hours_met` em `TimeTrackingService.getSummary()`: verificar que `min_hours_met: true` quando `total_minutes >= min_week_hours * 60` e `false` quando abaixo
- [x] 1.3 Escrever testes de controller para `GET /time-entries`: verificar HTTP 401 sem token, HTTP 403 para não-superusuário, HTTP 400 para `week=-1` ou `week=abc`, HTTP 200 com shape correto para superusuário
- [x] 1.4 Confirmar que todos os novos testes falham (estado RED) antes de qualquer implementação

## 2. DTOs e interfaces

- [x] 2.1 Adicionar `min_hours_met: boolean` à interface `SummaryResponse` em `src/modules/time-tracking/dto/time-tracking.dto.ts`
- [x] 2.2 Criar interface `MemberWeeklySummary` em `dto/time-tracking.dto.ts` com campos `user_id`, `name`, `total_minutes`, `min_hours_met`
- [x] 2.3 Criar interface `TimeEntriesListResponse` em `dto/time-tracking.dto.ts` com campos `week_start`, `week_end`, `min_week_hours`, `members: MemberWeeklySummary[]`

## 3. Service — getSummary com min_hours_met

- [x] 3.1 Injetar `SettingsService` em `TimeTrackingService` (construtor e campo privado)
- [x] 3.2 No método `getSummary()`, ler `min_week_hours` via `this.settingsService.get('min_week_hours')` e calcular `min_hours_met = totalMinutes >= minWeekHours * 60`
- [x] 3.3 Incluir `min_hours_met` no objeto retornado por `getSummary()`

## 4. Service — getWeeklySummaryList

- [x] 4.1 Implementar método `getWeeklySummaryList(weekOffset: number): Promise<TimeEntriesListResponse>` em `TimeTrackingService`
- [x] 4.2 Calcular `weekStart` e `weekEnd` via Postgres: `date_trunc('week', now() - ($1 * interval '1 week'))` e `+ interval '7 days'`
- [x] 4.3 Executar query com `LEFT JOIN` entre `users` e `time_entries` agrupando por `user_id` e `name`, filtrando `users.inactive = FALSE` (exclui soft-deletados) e entradas `is_valid = TRUE` dentro do intervalo
- [x] 4.4 Ler `min_week_hours` de `SettingsService` e calcular `min_hours_met` para cada membro
- [x] 4.5 Calcular `week_start` e `week_end` como strings ISO date (YYYY-MM-DD) para o envelope de resposta
- [x] 4.6 Retornar `TimeEntriesListResponse` com `min_week_hours`, `week_start`, `week_end` e array `members` ordenado por `name`

## 5. Controller — GET /time-entries

- [x] 5.1 Adicionar handler `@Get()` em `TimeTrackingController` para `GET /time-entries`
- [x] 5.2 Receber query param `week` com `@Query('week') week = '0'`, converter para inteiro com `parseInt`, e rejeitar com `BadRequestException` se não for inteiro >= 0
- [x] 5.3 Verificar `isSuperuser(req.user.role)` e lançar `ForbiddenException` se não for superusuário
- [x] 5.4 Delegar para `this.timeTrackingService.getWeeklySummaryList(weekOffset)` e retornar o resultado com HTTP 200

## 6. Verificação final

- [x] 6.1 Confirmar que todos os testes passam com `npm test`
- [x] 6.2 Confirmar ausência de erros de ESLint nos arquivos modificados: `time-tracking.controller.ts`, `time-tracking.service.ts`, `dto/time-tracking.dto.ts`
- [ ] 6.3 Verificar manualmente os endpoints com um cliente HTTP (ex: Insomnia): `GET /time-entries`, `GET /time-entries?week=1`, `GET /time-entries/summary/me` (checar presença de `min_hours_met`)
