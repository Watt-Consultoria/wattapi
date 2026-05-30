## ADDED Requirements

### Requirement: Notification data model
A notification SHALL have the following fields: `id` (UUID, PK), `user_id` (UUID, FK → users.id, NOT NULL), `title` (TEXT, NOT NULL), `description` (TEXT, nullable), `origin` (enum: automatic | directed, NOT NULL), `sent_at` (TIMESTAMPTZ, NOT NULL, default now()), `created_by` (UUID, FK → users.id, nullable — null for automatic), `deleted_at` (TIMESTAMPTZ, nullable — null means active), `created_at` (TIMESTAMPTZ, NOT NULL, default now()).

#### Scenario: Notification row structure
- **WHEN** a notification is inserted into the database
- **THEN** it SHALL have all NOT NULL fields populated and `deleted_at` set to NULL

#### Scenario: Automatic notification has no created_by
- **WHEN** a notification with origin='automatic' is created
- **THEN** `created_by` SHALL be NULL

#### Scenario: Directed notification has created_by set
- **WHEN** a superuser creates a notification via POST /notifications
- **THEN** `created_by` SHALL be set to the superuser's user ID

### Requirement: List own notifications
`GET /notifications` SHALL return all notifications for the authenticated user where `deleted_at IS NULL`, ordered by `sent_at DESC`.

#### Scenario: Returns only own non-deleted notifications
- **WHEN** an authenticated user calls `GET /notifications`
- **THEN** only notifications where `user_id` equals the requester's ID and `deleted_at IS NULL` are returned, ordered by `sent_at DESC`

#### Scenario: Soft-deleted notifications are excluded
- **WHEN** a notification has `deleted_at` set and the owner calls `GET /notifications`
- **THEN** that notification SHALL NOT appear in the response

#### Scenario: Unauthenticated request is rejected
- **WHEN** `GET /notifications` is called without a valid JWT
- **THEN** the system SHALL return 401 Unauthorized

### Requirement: Soft delete own notification
`DELETE /notifications/:id` SHALL set `deleted_at = now()` on the notification. Only the owner (user_id = requester) may delete their notification.

#### Scenario: Owner soft-deletes own notification
- **WHEN** the owner sends `DELETE /notifications/:id`
- **THEN** `deleted_at` is set to the current timestamp and the system returns 204 No Content

#### Scenario: Non-owner delete attempt is rejected
- **WHEN** a user sends `DELETE /notifications/:id` for a notification they do not own
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Notification not found returns 404
- **WHEN** `DELETE /notifications/:id` is called with an ID that does not exist or belongs to a deleted notification
- **THEN** the system SHALL return 404 Not Found

#### Scenario: Unauthenticated request is rejected
- **WHEN** `DELETE /notifications/:id` is called without a valid JWT
- **THEN** the system SHALL return 401 Unauthorized

### Requirement: Create directed notification (superusers only)
`POST /notifications` SHALL allow users with rank >= 3 (assessor, presidente) to create directed notifications for a resolved set of recipients. The body SHALL contain `title` (required), `description` (optional), and `target` (required object with optional `sector` and `role` fields). All active users matching the target filter receive a notification row with `origin='directed'` and `created_by` set to the requester's ID.

#### Scenario: Non-superuser is rejected
- **WHEN** a user with rank < 3 calls `POST /notifications`
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: target {} sends to all active users
- **WHEN** a superuser sends `POST /notifications` with `target: {}`
- **THEN** one notification row is inserted for every active user (inactive=false), and the response returns `{ count: N }`

#### Scenario: target with sector only filters by sector
- **WHEN** a superuser sends `POST /notifications` with `target: { sector: "comercial" }`
- **THEN** notifications are created only for active users in sector "comercial"

#### Scenario: target with role only filters by role
- **WHEN** a superuser sends `POST /notifications` with `target: { role: "diretor" }`
- **THEN** notifications are created only for active users with role "diretor"

#### Scenario: target with sector and role filters intersection
- **WHEN** a superuser sends `POST /notifications` with `target: { sector: "comercial", role: "diretor" }`
- **THEN** notifications are created only for active users who are both in sector "comercial" AND have role "diretor"

#### Scenario: Sender receives notification too
- **WHEN** a superuser sends `POST /notifications` with a target that includes themselves
- **THEN** the superuser also receives a notification row

#### Scenario: Missing title is rejected
- **WHEN** `POST /notifications` is called without `title`
- **THEN** the system SHALL return 400 Bad Request

#### Scenario: Response includes count of created notifications
- **WHEN** `POST /notifications` succeeds
- **THEN** the response SHALL be `{ count: N }` where N is the number of notification rows inserted
