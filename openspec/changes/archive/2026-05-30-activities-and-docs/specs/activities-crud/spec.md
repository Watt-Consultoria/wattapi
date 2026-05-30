## ADDED Requirements

### Requirement: Activity data model
An activity SHALL have the following fields: `id` (UUID, PK), `user_id` (UUID, FK → users.id), `name` (TEXT, NOT NULL), `description` (TEXT, nullable), `date` (DATE, NOT NULL), `time_start` (TIME, NOT NULL), `time_end` (TIME, NOT NULL), `priority` (enum: alta | media | baixa, NOT NULL), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ). The constraint `time_end > time_start` SHALL be enforced at the database level.

#### Scenario: Valid activity creation
- **WHEN** a request is made to `POST /activities` with valid fields
- **THEN** the system SHALL persist the activity with `user_id` set to the authenticated user's ID and return 201 with the created activity object

#### Scenario: time_end before time_start is rejected
- **WHEN** a request is made to `POST /activities` with `time_end` equal to or before `time_start`
- **THEN** the system SHALL return 400 Bad Request

#### Scenario: Missing required fields are rejected
- **WHEN** a request is made to `POST /activities` with any of `name`, `date`, `time_start`, `time_end`, or `priority` absent
- **THEN** the system SHALL return 400 Bad Request

### Requirement: Create activity
Authenticated users SHALL be able to create activities only for themselves. The `user_id` of the new activity is always set to the requester's JWT `sub`.

#### Scenario: Activity is created for the authenticated user
- **WHEN** a user sends `POST /activities` with valid data
- **THEN** the returned activity SHALL have `user_id` equal to the authenticated user's ID

#### Scenario: Unauthenticated request is rejected
- **WHEN** `POST /activities` is called without a valid JWT
- **THEN** the system SHALL return 401 Unauthorized

### Requirement: List activities with date and user filters
`GET /activities` SHALL return all activities visible to the requester (per visibility rules), ordered by `date DESC, time_start ASC`. Optional query params: `?date=YYYY-MM-DD` (exact day), `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?id=user_uuid`. When `date` is provided it SHALL override `from`/`to`. When only `from` or only `to` is provided the open-ended filter SHALL be applied. The `?id=` filter narrows results to a specific user but visibility rules still apply — requesting activities from a user outside the requester's visibility scope returns an empty array.

#### Scenario: List without filters returns all visible activities
- **WHEN** `GET /activities` is called with no query params
- **THEN** all activities visible to the requester are returned ordered by date DESC, time_start ASC

#### Scenario: Filter by exact date
- **WHEN** `GET /activities?date=2025-06-01` is called
- **THEN** only activities with `date = 2025-06-01` visible to the requester are returned

#### Scenario: Filter by date range
- **WHEN** `GET /activities?from=2025-06-01&to=2025-06-30` is called
- **THEN** only activities with `date` between 2025-06-01 and 2025-06-30 (inclusive) visible to the requester are returned

#### Scenario: date param overrides from/to
- **WHEN** `GET /activities?date=2025-06-15&from=2025-06-01&to=2025-06-30` is called
- **THEN** only activities with `date = 2025-06-15` are returned

#### Scenario: filter by user id within visibility scope
- **WHEN** `GET /activities?id=<user_uuid>` is called and the target user is visible to the requester
- **THEN** only activities belonging to that user are returned

#### Scenario: filter by user id outside visibility scope returns empty
- **WHEN** `GET /activities?id=<user_uuid>` is called and the target user is NOT visible to the requester
- **THEN** an empty array is returned (visibility rules are not bypassed)

### Requirement: Own activities shortcut
`GET /activities/me` SHALL return only the authenticated user's own activities, supporting the same date filters (`?date=`, `?from=`, `?to=`) as `GET /activities`. Visibility rules do not apply — only the requester's own activities are returned regardless of role.

#### Scenario: returns only own activities
- **WHEN** `GET /activities/me` is called by any authenticated user
- **THEN** only activities where `user_id` equals the requester's ID are returned

#### Scenario: superuser gets only own activities via /me
- **WHEN** an assessor or presidente calls `GET /activities/me`
- **THEN** only their own activities are returned (not all activities)

#### Scenario: supports date filters
- **WHEN** `GET /activities/me?date=2026-06-01` is called
- **THEN** only own activities on that date are returned

### Requirement: Edit own activity
Authenticated users SHALL be able to update their own activities via `PATCH /activities/:id`. Any subset of fields (`name`, `description`, `date`, `time_start`, `time_end`, `priority`) may be provided. At least one field is required.

#### Scenario: Owner can edit their activity
- **WHEN** the owner sends `PATCH /activities/:id` with valid fields
- **THEN** the activity is updated and the updated object is returned with 200

#### Scenario: Non-owner edit attempt is rejected
- **WHEN** a user sends `PATCH /activities/:id` for an activity they do not own
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Activity not found returns 404
- **WHEN** `PATCH /activities/:id` is called with an ID that does not exist
- **THEN** the system SHALL return 404 Not Found

#### Scenario: Empty body is rejected
- **WHEN** `PATCH /activities/:id` is called with an empty body `{}`
- **THEN** the system SHALL return 400 Bad Request

### Requirement: Delete own activity
Authenticated users SHALL be able to delete their own activities via `DELETE /activities/:id`. The deletion is permanent (hard delete).

#### Scenario: Owner can delete their activity
- **WHEN** the owner sends `DELETE /activities/:id`
- **THEN** the activity is permanently removed and the system returns 204 No Content

#### Scenario: Non-owner delete attempt is rejected
- **WHEN** a user sends `DELETE /activities/:id` for an activity they do not own
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Activity not found returns 404
- **WHEN** `DELETE /activities/:id` is called with an ID that does not exist
- **THEN** the system SHALL return 404 Not Found
