## ADDED Requirements

### Requirement: Superuser can create a hero from an inactive user
An authenticated user with rank >= 3 (superuser) SHALL be able to create a hero by referencing an existing user marked `inactive = true`, and providing `phrase`, `contributions` (non-empty array of strings), `start_year`, `end_year`, and `photo_path` referencing a file already uploaded to the `hero-photos` storage bucket. `name` and `role` are NOT provided in the request — they are derived from the referenced user. The system SHALL verify the `photo_path` exists in the storage bucket before persisting the hero.

#### Scenario: Successful creation
- **WHEN** a superuser sends `POST /heroes` with a valid `user_id` (referencing a user with `inactive = true` and no existing hero), `phrase`, non-empty `contributions`, `start_year` <= `end_year`, and a `photo_path` that exists in the `hero-photos` bucket
- **THEN** the system SHALL persist a `heroes` row and return `201` with the created hero, including `name` and `role` copied from the referenced user, `contributions` as an array, and a signed `photo_url` instead of the raw path

#### Scenario: Non-superuser attempts to create a hero
- **WHEN** an authenticated user with rank < 3 sends `POST /heroes`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `POST /heroes` without a valid JWT
- **THEN** the system SHALL return `401`

#### Scenario: Referenced user does not exist
- **WHEN** a superuser sends `POST /heroes` with a `user_id` that does not match any user
- **THEN** the system SHALL return `404`

#### Scenario: Referenced user is not inactive
- **WHEN** a superuser sends `POST /heroes` with a `user_id` referencing a user where `inactive = false`
- **THEN** the system SHALL return `400`

#### Scenario: Referenced user already has a hero
- **WHEN** a superuser sends `POST /heroes` with a `user_id` that already has a `heroes` row
- **THEN** the system SHALL return `409`

#### Scenario: Missing required fields
- **WHEN** a superuser sends `POST /heroes` without `user_id`, `phrase`, `contributions`, `start_year`, `end_year`, or `photo_path`
- **THEN** the system SHALL return `400`

#### Scenario: Empty contributions list
- **WHEN** a superuser sends `POST /heroes` with `contributions` as an empty array
- **THEN** the system SHALL return `400`

#### Scenario: start_year after end_year
- **WHEN** a superuser sends `POST /heroes` with `start_year` greater than `end_year`
- **THEN** the system SHALL return `400`

#### Scenario: Photo path not found in storage
- **WHEN** a superuser sends `POST /heroes` with a valid body and `photo_path` that does not exist in the `hero-photos` storage bucket
- **THEN** the system SHALL return `400` with a message identifying the missing file

---

### Requirement: Any authenticated user can list all heroes
Any authenticated user, regardless of rank, SHALL be able to retrieve the full list of heroes, ordered by creation date (most recent first). Each hero in the response SHALL include `name` and `role` from the currently referenced user, `contributions` as an array of strings, and a time-limited signed `photo_url` (valid for 1 hour) instead of the raw storage path.

#### Scenario: List heroes
- **WHEN** an authenticated user sends `GET /heroes`
- **THEN** the system SHALL return `200` with an array of all heroes, each containing `id`, `user_id`, `name`, `role`, `phrase`, `contributions` (array), `start_year`, `end_year`, `photo_url`, `created_at`, `updated_at`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /heroes` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Any authenticated user can retrieve a single hero
Any authenticated user, regardless of rank, SHALL be able to retrieve a specific hero by its UUID.

#### Scenario: Retrieve existing hero
- **WHEN** an authenticated user sends `GET /heroes/:id` with a valid hero UUID
- **THEN** the system SHALL return `200` with the hero, including `name` and `role` from the referenced user and a signed `photo_url`

#### Scenario: Hero not found
- **WHEN** an authenticated user sends `GET /heroes/:id` with a UUID that does not match any hero
- **THEN** the system SHALL return `404`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /heroes/:id` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Superuser can update an existing hero
An authenticated user with rank >= 3 (superuser) SHALL be able to update a hero's `phrase`, `contributions`, `start_year`, `end_year`, and/or `photo_path`. `user_id` is immutable and SHALL NOT be editable through this route. At least one field SHALL be provided.

#### Scenario: Successful partial update
- **WHEN** a superuser sends `PATCH /heroes/:id` with at least one of `phrase`, `contributions`, `start_year`, `end_year`, `photo_path`
- **THEN** the system SHALL update only the provided fields and return `200` with the updated hero

#### Scenario: Non-superuser attempts to update
- **WHEN** an authenticated user with rank < 3 sends `PATCH /heroes/:id`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `PATCH /heroes/:id` without a valid JWT
- **THEN** the system SHALL return `401`

#### Scenario: Empty body
- **WHEN** a superuser sends `PATCH /heroes/:id` with an empty body
- **THEN** the system SHALL return `400`

#### Scenario: Hero not found
- **WHEN** a superuser sends `PATCH /heroes/:id` with a UUID that does not match any hero
- **THEN** the system SHALL return `404`

#### Scenario: Updated photo path not found in storage
- **WHEN** a superuser sends `PATCH /heroes/:id` with a `photo_path` that does not exist in the `hero-photos` storage bucket
- **THEN** the system SHALL return `400` with a message identifying the missing file

#### Scenario: start_year after end_year after update
- **WHEN** a superuser sends `PATCH /heroes/:id` that results in `start_year` greater than `end_year` (considering existing values for fields not provided)
- **THEN** the system SHALL return `400`
