## ADDED Requirements

### Requirement: Authenticated user can submit a reimbursement request
Any active authenticated user SHALL be able to submit a reimbursement request by providing a title, detailed description, amount in cents, category, PIX key, and at least one attachment path referencing a file already uploaded to Supabase Storage. Attachments are mandatory — the system SHALL reject requests with an empty or absent `attachments` array. The system SHALL also verify that each attachment path actually exists in the storage bucket before persisting the request.

#### Scenario: Successful submission
- **WHEN** an authenticated user sends `POST /reimbursements` with valid `title`, `description`, `amount_cents` (positive integer), `category` (valid enum value), `pix_key`, and `attachments` (non-empty array of `{ path, name }` where each path exists in the `reimbursement-receipts` bucket)
- **THEN** the system SHALL persist a `reimbursements` row with `status = 'pending'` and one `reimbursement_attachments` row per attachment, and return `201` with the created reimbursement including its attachments

#### Scenario: Submission with no attachments
- **WHEN** an authenticated user sends `POST /reimbursements` with valid fields but `attachments` is an empty array or omitted
- **THEN** the system SHALL return `400`

#### Scenario: Attachment path not found in storage
- **WHEN** an authenticated user sends `POST /reimbursements` with a valid body and `attachments` containing a path that does not exist in the `reimbursement-receipts` storage bucket
- **THEN** the system SHALL return `400` with a message identifying the missing file

#### Scenario: Invalid category value
- **WHEN** an authenticated user sends `POST /reimbursements` with a `category` not in `['ingresso', 'alimentação', 'transporte', 'equipamento', 'outro']`
- **THEN** the system SHALL return `400`

#### Scenario: Missing required fields
- **WHEN** an authenticated user sends `POST /reimbursements` without `title`, `description`, `amount_cents`, `category`, or `pix_key`
- **THEN** the system SHALL return `400`

#### Scenario: Amount in cents must be positive
- **WHEN** an authenticated user sends `POST /reimbursements` with `amount_cents` equal to zero or negative
- **THEN** the system SHALL return `400`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `POST /reimbursements` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: User can list their own reimbursements
Any active authenticated user SHALL be able to retrieve their own reimbursement requests. Each reimbursement in the response SHALL include its attachments with time-limited signed URLs (valid for 1 hour) instead of raw storage paths.

#### Scenario: List own reimbursements (default or target=me)
- **WHEN** an authenticated user sends `GET /reimbursements` or `GET /reimbursements?target=me`
- **THEN** the system SHALL return `200` with only the reimbursements belonging to that user, each containing a `attachments` array with `signed_url` and `name`

#### Scenario: Non-superuser attempts target=all
- **WHEN** an authenticated user with rank < 3 sends `GET /reimbursements?target=all`
- **THEN** the system SHALL return `403`

#### Scenario: Superuser lists all reimbursements
- **WHEN** an authenticated user with rank >= 3 sends `GET /reimbursements?target=all`
- **THEN** the system SHALL return `200` with all reimbursements from all users, each with signed URLs for attachments

---

### Requirement: Superuser can list reimbursements of a specific user
An authenticated user with rank >= 3 (superuser) SHALL be able to retrieve all reimbursement requests submitted by a specific user.

#### Scenario: Superuser fetches by user_id
- **WHEN** a superuser sends `GET /reimbursements/:user_id` with a valid user UUID
- **THEN** the system SHALL return `200` with all reimbursements belonging to that user, including signed URLs for attachments

#### Scenario: Non-superuser attempts to fetch by user_id
- **WHEN** a user with rank < 3 sends `GET /reimbursements/:user_id`
- **THEN** the system SHALL return `403`

#### Scenario: User not found
- **WHEN** a superuser sends `GET /reimbursements/:user_id` with a UUID that does not match any user
- **THEN** the system SHALL return `200` with an empty array
