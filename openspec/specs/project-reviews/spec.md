## ADDED Requirements

### Requirement: Director reviews a project submitted for review
A user with `role = 'diretor'` and `sector = 'projetos'` (or a superuser) SHALL be able to review a project in `status = 'em_revisao'` via `PATCH /projects/:id/reviews`, specifying `approved` (boolean) and `notes`. The system SHALL persist a `project_reviews` row with an auto-incremented `round` (per project, starting at 1). On approval, the system SHALL set the project's `status` to `'revisado'`. On rejection, the system SHALL set the project's `status` back to `'em_andamento'`. Either outcome SHALL notify the project's manager.

#### Scenario: Approve a project
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id/reviews` with `{ approved: true, notes: '...' }` for a project with `status = 'em_revisao'`
- **THEN** the system SHALL persist a `project_reviews` row with `round` incremented from the project's prior review rounds, set the project's `status` to `'revisado'`, return `200`, and insert a `notifications` row for the project's manager

#### Scenario: Reject a project
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id/reviews` with `{ approved: false, notes: '...' }` for a project with `status = 'em_revisao'`
- **THEN** the system SHALL persist a `project_reviews` row with `approved = false`, set the project's `status` back to `'em_andamento'`, return `200`, and insert a `notifications` row for the project's manager

#### Scenario: Missing notes
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id/reviews` without `notes`
- **THEN** the system SHALL return `400`

#### Scenario: Project is not em_revisao
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id/reviews` for a project whose `status` is not `'em_revisao'`
- **THEN** the system SHALL return `409`

#### Scenario: Non-director attempts to review
- **WHEN** a user who is not a `diretor` of sector `projetos` (and not a superuser) sends `PATCH /projects/:id/reviews`
- **THEN** the system SHALL return `403`

#### Scenario: Project not found
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id/reviews` for a project id that does not exist
- **THEN** the system SHALL return `404`

---

### Requirement: Authenticated user can list a project's review history
Any active authenticated user SHALL be able to retrieve all director review rounds for a project, ordered by `round` descending.

#### Scenario: List review rounds
- **WHEN** an authenticated user sends `GET /projects/:id/reviews` for a project that has been reviewed at least once
- **THEN** the system SHALL return `200` with all `project_reviews` rows for that project ordered by `round DESC`

#### Scenario: No reviews yet
- **WHEN** an authenticated user sends `GET /projects/:id/reviews` for a project that has never been submitted for director review
- **THEN** the system SHALL return `200` with an empty array

#### Scenario: Project not found
- **WHEN** an authenticated user sends `GET /projects/:id/reviews` for a project id that does not exist
- **THEN** the system SHALL return `404`
