## ADDED Requirements

### Requirement: Push subscription data model
A push subscription SHALL have the following fields: `id` (UUID, PK, default gen_random_uuid()), `user_id` (UUID, FK → users.id, NOT NULL), `endpoint` (TEXT, NOT NULL — URL do push service do browser), `p256dh` (TEXT, NOT NULL — chave pública do cliente), `auth` (TEXT, NOT NULL — segredo de autenticação), `created_at` (TIMESTAMPTZ, NOT NULL, default now()), `deleted_at` (TIMESTAMPTZ, nullable — null significa ativa). A combinação `(user_id, endpoint)` SHALL ser única entre subscrições ativas (deleted_at IS NULL).

#### Scenario: Push subscription row structure
- **WHEN** uma subscrição é registrada
- **THEN** SHALL ter `user_id`, `endpoint`, `p256dh`, `auth` preenchidos e `deleted_at = NULL`

#### Scenario: Duplicate endpoint for same user is rejected
- **WHEN** o mesmo `endpoint` já existe com `deleted_at IS NULL` para o mesmo `user_id`
- **THEN** o sistema SHALL retornar 409 Conflict

---

### Requirement: Register push subscription
`POST /push-subscriptions` SHALL permitir que um usuário autenticado registre a subscrição Web Push do seu dispositivo. O body SHALL conter `endpoint` (string, required), `p256dh` (string, required) e `auth` (string, required). O `user_id` é derivado do JWT do requisitante.

#### Scenario: Successful registration
- **WHEN** um usuário autenticado envia `POST /push-subscriptions` com `endpoint`, `p256dh` e `auth` válidos
- **THEN** uma linha é inserida em `push_subscriptions` com `user_id` do requisitante e o sistema retorna 201 Created com o `id` da subscrição criada

#### Scenario: Missing required field is rejected
- **WHEN** `POST /push-subscriptions` é chamado sem `endpoint`, `p256dh` ou `auth`
- **THEN** o sistema SHALL retornar 400 Bad Request

#### Scenario: Unauthenticated request is rejected
- **WHEN** `POST /push-subscriptions` é chamado sem JWT válido
- **THEN** o sistema SHALL retornar 401 Unauthorized

---

### Requirement: Unregister push subscription
`DELETE /push-subscriptions/:id` SHALL permitir que o dono da subscrição a remova (soft delete: `deleted_at = now()`). Apenas o próprio usuário pode remover suas subscrições.

#### Scenario: Owner removes own subscription
- **WHEN** o dono envia `DELETE /push-subscriptions/:id`
- **THEN** `deleted_at` é setado para o timestamp atual e o sistema retorna 204 No Content

#### Scenario: Non-owner removal is rejected
- **WHEN** um usuário tenta deletar uma subscrição que pertence a outro usuário
- **THEN** o sistema SHALL retornar 403 Forbidden

#### Scenario: Subscription not found returns 404
- **WHEN** `DELETE /push-subscriptions/:id` é chamado com um ID inexistente ou já removido
- **THEN** o sistema SHALL retornar 404 Not Found

#### Scenario: Unauthenticated request is rejected
- **WHEN** `DELETE /push-subscriptions/:id` é chamado sem JWT válido
- **THEN** o sistema SHALL retornar 401 Unauthorized

---

### Requirement: Expose VAPID public key
`GET /push-subscriptions/vapid-public-key` SHALL retornar a chave pública VAPID necessária para o frontend registrar a subscrição via `PushManager.subscribe()`. Este endpoint SHALL ser público (sem autenticação requerida) para simplificar o bootstrap do service worker.

#### Scenario: Returns VAPID public key
- **WHEN** qualquer cliente chama `GET /push-subscriptions/vapid-public-key`
- **THEN** o sistema SHALL retornar 200 com `{ "vapid_public_key": "<base64url-encoded-key>" }`

#### Scenario: Key is the configured VAPID_PUBLIC_KEY env var
- **WHEN** a env var `VAPID_PUBLIC_KEY` está configurada
- **THEN** o valor retornado SHALL ser idêntico ao valor da env var

---

### Requirement: Automatic cleanup of expired subscriptions
Quando o push service retornar HTTP 410 (Gone) ao tentar entregar uma notificação, a subscrição correspondente SHALL ser marcada como removida (`deleted_at = now()`) pela Edge Function, sem intervenção manual.

#### Scenario: 410 Gone triggers soft delete
- **WHEN** a Edge Function `notification-push-trigger` recebe 410 do push service para uma subscrição
- **THEN** a subscrição SHALL ter `deleted_at` setado e não será mais usada para futuros pushes
