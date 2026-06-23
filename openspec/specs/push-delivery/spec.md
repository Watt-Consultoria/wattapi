## Requirements

### Requirement: Push delivery triggered on notification insert
Um Supabase Database Webhook SHALL invocar a Edge Function `notification-push-trigger` após cada INSERT na tabela `notifications`. A Edge Function SHALL enviar Web Push para todas as subscrições ativas (`deleted_at IS NULL`) do `user_id` da notificação inserida. O envio SHALL usar o protocolo Web Push com autenticação VAPID.

#### Scenario: Directed notification triggers push
- **WHEN** uma notificação com `origin='directed'` é inserida via `POST /notifications`
- **THEN** o webhook dispara a Edge Function, que entrega push para os dispositivos ativos do `user_id` destinatário

#### Scenario: Automatic notification triggers push
- **WHEN** uma notificação com `origin='automatic'` é inserida pelo pg_cron
- **THEN** o webhook dispara a Edge Function, que entrega push para os dispositivos ativos do `user_id` destinatário

#### Scenario: User with no subscriptions receives no push
- **WHEN** uma notificação é inserida para um usuário sem subscrições ativas
- **THEN** a Edge Function SHALL concluir sem erro e sem tentar envio (count = 0)

#### Scenario: Multiple subscriptions receive push in parallel
- **WHEN** um usuário tem N subscrições ativas e uma notificação é inserida
- **THEN** a Edge Function SHALL tentar enviar push para todas as N subscrições

---

### Requirement: Push payload format
O payload Web Push enviado pela Edge Function SHALL conter `title` e `body` derivados dos campos da notificação. O `title` SHALL ser o campo `title` da notificação. O `body` SHALL ser o campo `description` da notificação (omitido se null).

#### Scenario: Notification with description
- **WHEN** a notificação tem `title = "Atividade agendada"` e `description = "Reunião às 14h"`
- **THEN** o push SHALL ter `title = "Atividade agendada"` e `body = "Reunião às 14h"`

#### Scenario: Notification without description
- **WHEN** a notificação tem `description = NULL`
- **THEN** o push SHALL ter apenas `title` preenchido, sem campo `body`

---

### Requirement: Database Webhook registered via migration
O Supabase Database Webhook SHALL ser registrado via migration SQL usando `supabase_functions.http_request()` ou equivalente, garantindo que o webhook seja versionado e aplicado consistentemente em todos os ambientes.

#### Scenario: Migration registers the webhook
- **WHEN** a migration de webhook é aplicada
- **THEN** um webhook ativo existe na tabela `supabase_functions.hooks` (ou equivalente) apontando para `notification-push-trigger` no evento INSERT da tabela `notifications`

---

### Requirement: VAPID authentication for push delivery
O envio Web Push SHALL usar VAPID (Voluntary Application Server Identification) com o par de chaves configurado nos secrets do Supabase. O `subject` do VAPID SHALL ser o email de contato da aplicação.

#### Scenario: Push is signed with VAPID keys
- **WHEN** a Edge Function envia uma notificação push
- **THEN** o request ao push service SHALL incluir o header `Authorization: vapid ...` assinado com `VAPID_PRIVATE_KEY`

#### Scenario: Missing VAPID secrets aborts delivery
- **WHEN** `VAPID_PUBLIC_KEY` ou `VAPID_PRIVATE_KEY` não estão configurados nos secrets
- **THEN** a Edge Function SHALL retornar erro 500 e logar a ausência das variáveis, sem tentar envio

---

### Requirement: Expired subscription auto-cleanup on delivery
Quando o push service retornar 410 (Gone) para uma subscrição durante a entrega, a Edge Function SHALL realizar soft delete dessa subscrição (`deleted_at = now()`) via query no banco Supabase antes de concluir.

#### Scenario: 410 response removes subscription
- **WHEN** o push service retorna 410 para uma subscrição durante a tentativa de entrega
- **THEN** a Edge Function SHALL atualizar `push_subscriptions SET deleted_at = now() WHERE id = <id>` e continuar tentando as demais subscrições do usuário

#### Scenario: Non-410 errors do not remove subscription
- **WHEN** o push service retorna outro erro (ex: 429 Too Many Requests, timeout)
- **THEN** a subscrição SHALL permanecer ativa e o erro SHALL ser logado sem alterar `deleted_at`
