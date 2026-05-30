## Why

O sistema não possui mecanismo de notificações para informar usuários sobre eventos relevantes — como atividades agendadas para o dia — nem permite que superusuários comuniquem mensagens direcionadas a grupos específicos. A ausência desse canal reduz o engajamento e obriga comunicações fora da plataforma.

## What Changes

- Novo endpoint `GET /notifications`: lista as notificações não deletadas do usuário autenticado, ordenado por `sent_at DESC`.
- Novo endpoint `DELETE /notifications/:id`: soft delete de uma notificação própria.
- Novo endpoint `POST /notifications`: exclusivo para superusuários (rank >= 3); cria notificações dirigidas com filtro por `sector`, `role`, ou ambos; target vazio (`{}`) envia para todos os usuários ativos.
- Nova tabela `notifications` com suporte a soft delete (`deleted_at`) e rastreamento de origem (`automatic` | `directed`) e de remetente (`created_by`).
- Duas novas migrations Supabase: criação da tabela e agendamento de cronjob via pg_cron.
- Cronjob automático às 03:00 UTC (meia-noite Brasília): uma notificação por atividade com `date = hoje`, criada automaticamente para o dono da atividade.

## Capabilities

### New Capabilities

- `notifications-crud`: CRUD de notificações — listar (GET), deletar com soft delete (DELETE), e criar notificações dirigidas (POST restrito a superusuários) com resolução de destinatários por sector/role.
- `notifications-automatic`: Geração automática de notificações via pg_cron no Supabase; uma notificação por atividade agendada para o dia corrente, disparada diariamente à meia-noite no horário de Brasília.

### Modified Capabilities

## Impact

- **Novo módulo**: `src/modules/notifications/` (controller, service, module, dto)
- **Novas migrations**: `create-notifications-table.sql` e `schedule-activity-notifications-cron.sql`
- **Dependência de dados**: lê da tabela `activities` e `users`; escreve em `notifications`
- **Autorização**: POST restrito a superusuários via verificação de rank no service
- **Sem breaking changes** em endpoints existentes
