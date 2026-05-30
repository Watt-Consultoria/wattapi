## Context

O projeto usa NestJS com SQL cru via `DatabaseService` (pg). Autenticação via JWT com `RoutePolicyGuard`. Hierarquia de roles: consultor=0, gerente=1, diretor=2, assessor=3, presidente=4; superusuário = rank >= 3. Usuários têm `sector` como dimensão de agrupamento. O banco é Supabase (PostgreSQL). Migrations são arquivos SQL em `src/database/supabase/migrations/`.

## Goals / Non-Goals

**Goals:**
- Tabela `notifications` com soft delete e rastreamento de origem/remetente
- GET e DELETE para usuários autenticados (próprias notificações)
- POST restrito a superusuários com resolução de destinatários por sector/role
- Cronjob automático via pg_cron (independe do processo NestJS)

**Non-Goals:**
- Status de leitura (read_at / is_read)
- Paginação no GET (não especificada)
- WebSockets / push em tempo real
- Notificações automáticas além do cronjob de atividades

## Decisions

### 1. Fan-out: uma row por destinatário
**Decisão**: Cada destinatário recebe uma row independente em `notifications`.

**Alternativa considerada**: Tabela `notification_recipients` separada (normalizado).

**Rationale**: Queries simples, soft delete por usuário sem JOIN, alinha com o padrão do projeto (sem ORMs, SQL direto). O volume de notificações não justifica normalização neste estágio.

### 2. Soft delete via `deleted_at`
**Decisão**: `DELETE /notifications/:id` seta `deleted_at = now()`. Todas as queries de leitura filtram `WHERE deleted_at IS NULL`.

**Rationale**: Preserva registro consultável conforme requisito. Mesmo padrão que `users.inactive`.

### 3. Cronjob via pg_cron (Supabase), não @nestjs/schedule
**Decisão**: Migration SQL com `cron.schedule()` para o job diário de atividades.

**Alternativa considerada**: `@nestjs/schedule` no NestJS.

**Rationale**: pg_cron roda na camada do banco, independente do estado da API. A lógica é puramente SQL (SELECT activities → INSERT notifications), sem dependência de services TypeScript. Mais confiável para jobs noturnos.

### 4. Autorização do POST via verificação de rank no service
**Decisão**: O controller usa `@RoutePolicy({ access: { mode: 'authenticated' } })` e o service lança `ForbiddenException` se `getRank(requester.role) < 3`.

**Rationale**: Mantém o padrão existente de usar `RoutePolicyGuard` apenas para autenticação base, com lógica de autorização por rank no service — igual ao que já ocorre em outros módulos.

### 5. `target: {}` (objeto vazio) como sinal de "todos"
**Decisão**: Se nenhum dos campos `sector` ou `role` for fornecido, a notificação é enviada a todos os usuários ativos.

**Rationale**: Interface limpa; evita um campo `all: boolean` redundante. A validação Zod aceita `target` como objeto com campos opcionais.

## Risks / Trade-offs

- **Volume em broadcast**: `target: {}` gera uma row por usuário ativo. Aceitável no porte atual; monitorar se a base crescer muito.
- **Idempotência do cronjob**: Se o pg_cron rodar duas vezes no mesmo dia (ex: rerun manual), duplica notificações. Mitigação futura: adicionar constraint `UNIQUE (user_id, activity_id, date)` ou checar existência antes de inserir. Por ora, aceito.
- **Fuso horário no cronjob**: Usa `(now() AT TIME ZONE 'America/Sao_Paulo')::date`, que respeita horário de verão automaticamente.

## Migration Plan

1. Aplicar `create-notifications-table.sql` (nova tabela, indexes)
2. Aplicar `schedule-activity-notifications-cron.sql` (registra o job no pg_cron)
3. Deploy do módulo NestJS
4. Rollback: `DROP TABLE notifications CASCADE` + `SELECT cron.unschedule('daily-activity-notifications')`
