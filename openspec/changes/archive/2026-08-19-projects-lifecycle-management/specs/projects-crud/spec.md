## ADDED Requirements

### Requirement: Manager can fetch lookup data to build the project-creation form
A user with `MANAGER_ACCESS` SHALL be able to retrieve, via `GET /projects/lookups`, the three option lists needed to render a project-creation form in a single request: leads eligible for a new project, all portfolio service types, and consultants currently available in the `projetos` sector. This endpoint exists because the underlying `leads` list (`GET /leads`) is gated by a different access policy (`LEADS_ACCESS`) that a `projetos`-sector `gerente` does not satisfy — `GET /projects/lookups` is scoped to `MANAGER_ACCESS` instead, matching who is actually allowed to call `POST /projects`, and does not modify the `leads` module's own access rules.

#### Scenario: Successful lookup
- **WHEN** a `gerente` sends `GET /projects/lookups`
- **THEN** the system SHALL return `200` with `leads` (only rows where `status = 'em_progresso'`), `portfolio_items` (all rows), and `consultants` (`role = 'consultor'`, `sector = 'projetos'`, `inactive = false`)

#### Scenario: Non-manager attempts to fetch lookups
- **WHEN** a user who is not a `gerente` (and not a superuser) sends `GET /projects/lookups`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /projects/lookups` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Manager can create a project
A user with role `gerente` (or a superuser, rank >= 3) SHALL be able to create a project by providing `lead_id`, `project_type_id`, `name`, an optional `description`, and `delivery_date`. The system SHALL verify `lead_id` references an existing row in `leads` and `project_type_id` references an existing row in `portfolio_items` before persisting. The created project SHALL have `status = 'em_andamento'` and `created_by` set to the requester.

#### Scenario: Successful creation
- **WHEN** a `gerente` sends `POST /projects` with a valid `lead_id`, `project_type_id`, `name`, and `delivery_date`
- **THEN** the system SHALL persist a `projects` row with `status = 'em_andamento'`, `created_by` set to the requester's id, and return `201` with the created project

#### Scenario: Optional description omitted
- **WHEN** a `gerente` sends `POST /projects` without `description`
- **THEN** the system SHALL persist the project with `description = NULL` and return `201`

#### Scenario: Lead does not exist
- **WHEN** a `gerente` sends `POST /projects` with a `lead_id` that does not match any row in `leads`
- **THEN** the system SHALL return `404`

#### Scenario: Project type does not exist
- **WHEN** a `gerente` sends `POST /projects` with a `project_type_id` that does not match any row in `portfolio_items`
- **THEN** the system SHALL return `404`

#### Scenario: Missing required fields
- **WHEN** a `gerente` sends `POST /projects` without `lead_id`, `project_type_id`, `name`, or `delivery_date`
- **THEN** the system SHALL return `400`

#### Scenario: Non-manager attempts to create a project
- **WHEN** a user with role `consultor` or `diretor` sends `POST /projects`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `POST /projects` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Authenticated user can list projects, optionally filtered
Any active authenticated user SHALL be able to retrieve projects, ordered by `created_at` descending. The system SHALL accept optional, combinable query filters: `status`, `lead_id`, `created_by`, and `consultant_id`. `consultant_id` SHALL match projects that have at least one stage whose `consultant_id` equals the given value.

#### Scenario: List all projects
- **WHEN** an authenticated user sends `GET /projects` with no query parameters
- **THEN** the system SHALL return `200` with all `projects` rows ordered by `created_at DESC`

#### Scenario: Filter by status
- **WHEN** an authenticated user sends `GET /projects?status=em_andamento`
- **THEN** the system SHALL return `200` with only projects whose `status` is `'em_andamento'`

#### Scenario: Filter by lead
- **WHEN** an authenticated user sends `GET /projects?lead_id=<uuid>`
- **THEN** the system SHALL return `200` with only projects whose `lead_id` matches

#### Scenario: Filter by manager
- **WHEN** an authenticated user sends `GET /projects?created_by=<uuid>`
- **THEN** the system SHALL return `200` with only projects whose `created_by` matches

#### Scenario: Filter by assigned consultant
- **WHEN** a consultant sends `GET /projects?consultant_id=<their own id>`
- **THEN** the system SHALL return `200` with only projects that have at least one stage whose `consultant_id` matches

#### Scenario: Combined filters
- **WHEN** an authenticated user sends `GET /projects?status=em_andamento&created_by=<uuid>`
- **THEN** the system SHALL return `200` with only projects matching both conditions

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /projects` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Authenticated user can fetch a single project
Any active authenticated user SHALL be able to retrieve a single project by id.

#### Scenario: Project found
- **WHEN** an authenticated user sends `GET /projects/:id` with a valid project id
- **THEN** the system SHALL return `200` with the project

#### Scenario: Project not found
- **WHEN** an authenticated user sends `GET /projects/:id` with an id that does not match any project
- **THEN** the system SHALL return `404`

---

### Requirement: Manager submits a project for director review
The project's manager (the `gerente` who created it, or a superuser) SHALL be able to move a project from `em_andamento` to `em_revisao` via `PATCH /projects/:id` with `{ status: 'em_revisao' }`, but only once every stage of the project has `status = 'concluida'`. On success, the system SHALL notify every user with `role = 'diretor'` and `sector = 'projetos'`.

#### Scenario: Successful submission for review
- **WHEN** the project's manager sends `PATCH /projects/:id` with `{ status: 'em_revisao' }` and every stage of the project has `status = 'concluida'`
- **THEN** the system SHALL update the project's `status` to `'em_revisao'`, return `200` with the updated project, and insert one `notifications` row per `diretor` in sector `projetos`

#### Scenario: Not all stages are complete
- **WHEN** the project's manager sends `PATCH /projects/:id` with `{ status: 'em_revisao' }` while at least one stage does not have `status = 'concluida'`
- **THEN** the system SHALL return `409` and SHALL NOT change the project's status

#### Scenario: Project has no stages
- **WHEN** the project's manager sends `PATCH /projects/:id` with `{ status: 'em_revisao' }` for a project with zero stages
- **THEN** the system SHALL return `409`

#### Scenario: Requester is not the project's manager
- **WHEN** a `gerente` who did not create the project sends `PATCH /projects/:id` with `{ status: 'em_revisao' }`
- **THEN** the system SHALL return `403`

#### Scenario: Project is not in em_andamento
- **WHEN** the project's manager sends `PATCH /projects/:id` with `{ status: 'em_revisao' }` for a project whose current `status` is not `'em_andamento'`
- **THEN** the system SHALL return `409`

---

### Requirement: Director closes a finalized project
A user with `role = 'diretor'` and `sector = 'projetos'` (or a superuser) SHALL be able to close a project via `PATCH /projects/:id` with `{ status: 'finalizado', closing_notes }`, but only when the project's current `status` is `'revisado'`. `closing_notes` is required. On success the system SHALL set `closed_by` and `closed_at`, and SHALL notify every distinct consultant assigned to any stage of the project so they can submit feedback.

#### Scenario: Successful closing
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id` with `{ status: 'finalizado', closing_notes: '...' }` for a project with `status = 'revisado'`
- **THEN** the system SHALL update the project to `status = 'finalizado'`, set `closed_by` to the requester and `closed_at` to now, return `200`, and insert one `notifications` row for each distinct consultant assigned to any of the project's stages

#### Scenario: Missing closing notes
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id` with `{ status: 'finalizado' }` and no `closing_notes`
- **THEN** the system SHALL return `400`

#### Scenario: Project is not revisado
- **WHEN** a `diretor` of sector `projetos` sends `PATCH /projects/:id` with `{ status: 'finalizado', closing_notes: '...' }` for a project whose `status` is not `'revisado'`
- **THEN** the system SHALL return `409`

#### Scenario: Non-director attempts to close
- **WHEN** a user who is not a `diretor` of sector `projetos` (and not a superuser) sends `PATCH /projects/:id` with `{ status: 'finalizado', closing_notes: '...' }`
- **THEN** the system SHALL return `403`

---

### Requirement: Finalized projects are immutable
Once a project's `status` is `'finalizado'`, the system SHALL reject any further `PATCH /projects/:id` request.

#### Scenario: Attempt to modify a finalized project
- **WHEN** any user sends `PATCH /projects/:id` for a project whose current `status` is `'finalizado'`
- **THEN** the system SHALL return `409` and SHALL NOT modify the project
