## ADDED Requirements

### Requirement: Manager can create a stage within a project
The project's manager (or a superuser) SHALL be able to create a stage under an `em_andamento` project via `POST /projects/:id/stages`, specifying `delivery_date`, `deadline_date`, `name`, `description`, `position`, a non-empty list of `deliverables` (each with `name` and `description`), and `consultant_id`. The system SHALL validate that `delivery_date` is strictly before `deadline_date`, that `delivery_date` is on or before the project's `delivery_date`, and that `consultant_id` references an existing user. The created stage SHALL have `status = 'pendente'`. On success, the system SHALL notify the assigned consultant.

#### Scenario: Successful stage creation
- **WHEN** the project's manager sends `POST /projects/:id/stages` with valid `delivery_date` < `deadline_date` <= project delivery date is not required but `delivery_date` <= project's `delivery_date`, a `name`, `description`, `position`, at least one `deliverables` entry, and a valid `consultant_id`
- **THEN** the system SHALL persist a `project_stages` row with `status = 'pendente'`, persist one `project_stage_deliverables` row per requested deliverable, return `201` with the created stage and its deliverables, and insert a `notifications` row for `consultant_id`

#### Scenario: Delivery date after deadline date
- **WHEN** the project's manager sends `POST /projects/:id/stages` with `delivery_date` on or after `deadline_date`
- **THEN** the system SHALL return `400` and SHALL NOT persist the stage

#### Scenario: Stage delivery date after project delivery date
- **WHEN** the project's manager sends `POST /projects/:id/stages` with `delivery_date` after the parent project's `delivery_date`
- **THEN** the system SHALL return `400`

#### Scenario: No deliverables provided
- **WHEN** the project's manager sends `POST /projects/:id/stages` with an empty or missing `deliverables` array
- **THEN** the system SHALL return `400`

#### Scenario: Consultant does not exist
- **WHEN** the project's manager sends `POST /projects/:id/stages` with a `consultant_id` that does not match any user
- **THEN** the system SHALL return `404`

#### Scenario: Project not found
- **WHEN** a manager sends `POST /projects/:id/stages` for a project id that does not exist
- **THEN** the system SHALL return `404`

#### Scenario: Project is not em_andamento
- **WHEN** the project's manager sends `POST /projects/:id/stages` for a project whose `status` is not `'em_andamento'`
- **THEN** the system SHALL return `409`

#### Scenario: Non-manager attempts to create a stage
- **WHEN** a user who is not the project's manager (and not a superuser) sends `POST /projects/:id/stages`
- **THEN** the system SHALL return `403`

---

### Requirement: Authenticated user can list a project's stages, optionally filtered
Any active authenticated user SHALL be able to list all stages of a project, ordered by `position` ascending. The system SHALL accept optional, combinable query filters: `consultant_id` and `status`.

#### Scenario: List stages
- **WHEN** an authenticated user sends `GET /projects/:id/stages` for an existing project with no query parameters
- **THEN** the system SHALL return `200` with all `project_stages` rows for that project ordered by `position ASC`, each including its `deliverables`

#### Scenario: Filter by assigned consultant
- **WHEN** a consultant sends `GET /projects/:id/stages?consultant_id=<their own id>`
- **THEN** the system SHALL return `200` with only the stages of that project assigned to that consultant

#### Scenario: Filter by status
- **WHEN** an authenticated user sends `GET /projects/:id/stages?status=pendente`
- **THEN** the system SHALL return `200` with only stages of that project whose `status` is `'pendente'`

#### Scenario: Project not found
- **WHEN** an authenticated user sends `GET /projects/:id/stages` for a project id that does not exist
- **THEN** the system SHALL return `404`

---

### Requirement: Authenticated user can fetch a single stage
Any active authenticated user SHALL be able to retrieve a single stage of a project, including its deliverables checklist.

#### Scenario: Stage found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId` with a valid stage id belonging to the project
- **THEN** the system SHALL return `200` with the stage and its `deliverables`

#### Scenario: Stage not found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId` with a stage id that does not exist or does not belong to the project
- **THEN** the system SHALL return `404`

---

### Requirement: Manager can update a pending stage
The project's manager (or a superuser) SHALL be able to update a stage's `name`, `description`, `delivery_date`, `deadline_date`, `position`, or `consultant_id` via `PATCH /projects/:id/stages/:stageId`, but only while the stage's `status` is `'pendente'` and the parent project is not `'finalizado'`. The same date validations as creation apply to any updated dates. If `consultant_id` changes, the system SHALL notify the newly assigned consultant.

#### Scenario: Successful update
- **WHEN** the project's manager sends `PATCH /projects/:id/stages/:stageId` with a valid partial update for a stage with `status = 'pendente'`
- **THEN** the system SHALL persist the changes, return `200` with the updated stage, and, if `consultant_id` changed, insert a `notifications` row for the new consultant

#### Scenario: Stage is not pendente
- **WHEN** the project's manager sends `PATCH /projects/:id/stages/:stageId` for a stage whose `status` is `'em_revisao'` or `'concluida'`
- **THEN** the system SHALL return `409`

#### Scenario: Stage not found
- **WHEN** the project's manager sends `PATCH /projects/:id/stages/:stageId` with a stage id that does not exist or does not belong to the project
- **THEN** the system SHALL return `404`

#### Scenario: Non-manager attempts to update a stage
- **WHEN** a user who is not the project's manager (and not a superuser) sends `PATCH /projects/:id/stages/:stageId`
- **THEN** the system SHALL return `403`
