## Context

O módulo `time-tracking` (NestJS) já expõe clock-in/out e summaries individuais. A `SettingsService` é `@Global()` e expõe `get('min_week_hours')` via cache em memória, sem necessidade de importar o módulo explicitamente. O novo endpoint precisa agregar dados de todos os usuários ativos para uma semana selecionável.

## Goals / Non-Goals

**Goals:**
- Expor `GET /time-entries?week=<n>` retornando lista de todos os membros com total de minutos válidos e cumprimento da meta mínima de horas
- Adicionar `min_hours_met` às respostas de `/summary/me` e `/summary/:userId`
- Selecionar semana via query param `week` (0 = atual, 1 = anterior, n = n semanas atrás)

**Non-Goals:**
- Histórico de sessões individuais na listagem geral (apenas totais por membro)
- Paginação da listagem
- Filtros além da semana

## Decisions

### Query param de semana

**Decisão**: usar `?week=0` (named param) em vez de `?0` (positional).

`?week=0` é REST-idiomático, explícito para clientes e compatível com o `ParseIntPipe` do NestJS. O default é `0` (semana atual). Valores negativos são rejeitados com HTTP 400.

**Alternativa descartada**: `?0` posicional — não é suportado pelo query parser padrão e não é semântico.

### Cálculo do intervalo de semana

**Decisão**: calcular no Postgres com `date_trunc('week', now() - ($1 * interval '1 week'))`.

A função `date_trunc('week', ...)` retorna a segunda-feira às 00:00 UTC do início da semana ISO. O fim é `weekStart + interval '7 days'`. Isso garante consistência com o cálculo já usado em `getSummary`.

```sql
date_trunc('week', now() - ($1 * interval '1 week'))                       -- weekStart
date_trunc('week', now() - ($1 * interval '1 week')) + interval '7 days'  -- weekEnd
```

O valor `$1` é o offset recebido via query param.

### Agregação de membros

**Decisão**: uma única query com `LEFT JOIN` entre `users` e `time_entries`, agrupada por `user_id`.

```sql
SELECT u.id          AS user_id,
       u.name,
       COALESCE(
         SUM(EXTRACT(EPOCH FROM (te.clocked_out_at - te.clocked_in_at))::int),
         0
       )             AS total_seconds
FROM users u
LEFT JOIN time_entries te
       ON te.user_id = u.id
      AND te.is_valid = TRUE
      AND te.clocked_in_at >= <weekStart>
      AND te.clocked_in_at <  <weekEnd>
WHERE u.inactive = FALSE
GROUP BY u.id, u.name
ORDER BY u.name ASC
```

Isso inclui usuários sem nenhuma entrada na semana (total 0), garantindo visibilidade completa da equipe.

### Injeção de SettingsService

**Decisão**: injetar `SettingsService` diretamente em `TimeTrackingService`.

Como `SettingsModule` é `@Global()` e exporta `SettingsService`, não é necessário importar o módulo em `TimeTrackingModule`. A leitura de `min_week_hours` é via `settingsService.get('min_week_hours')` (retorna número em horas); a comparação com `total_minutes` usa `total_minutes >= minWeekHours * 60`.

### Autorização do endpoint de listagem

**Decisão**: restrito a superusuários (rank >= 3), usando o mesmo guard `RoutePolicyGuard` + verificação `isSuperuser` já presente no módulo.

### Shape de resposta — listagem geral

```jsonc
{
  "week_start": "2026-05-19",   // ISO date, segunda-feira
  "week_end": "2026-05-25",     // ISO date, domingo
  "min_week_hours": 40,
  "members": [
    {
      "user_id": "uuid",
      "name": "João Silva",
      "total_minutes": 2400,
      "min_hours_met": true
    }
  ]
}
```

### Shape de resposta — summaries individuais (modificação)

Adicionar `min_hours_met: boolean` ao `SummaryResponse` existente. O campo é calculado no `TimeTrackingService.getSummary()` antes de retornar, usando `total_minutes >= minWeekHours * 60`. Não afeta o cálculo da semana histórica — summaries sempre retornam a semana corrente.

## Risks / Trade-offs

- **Semana sempre corrente nos summaries** → `min_hours_met` em `/summary/me` e `/summary/:userId` sempre reflete a semana atual; não há seleção histórica nesses endpoints. Isso é intencional e consistente com o comportamento atual.
- **`date_trunc('week', ...)` usa ISO week (segunda-feira)** → pode divergir de expectativas de culturas que iniciam a semana no domingo. O comportamento já existe em `getSummary`; manter consistência é prioritário.
- **Offset muito grande** → sem limite superior definido. Pode ser adicionado posteriormente se necessário.
