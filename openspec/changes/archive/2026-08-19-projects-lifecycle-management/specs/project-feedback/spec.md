## ADDED Requirements

### Requirement: Consultant submits feedback on a closed project
A consultant who was assigned to at least one stage of a project SHALL be able to submit feedback via `POST /projects/:id/feedback` with an `answers` object, but only once the project's `status` is `'finalizado'`. Each consultant SHALL be able to submit at most one feedback response per project.

#### Scenario: Successful feedback submission
- **WHEN** a consultant who was assigned to at least one stage of a `finalizado` project sends `POST /projects/:id/feedback` with a valid `answers` object and has not previously submitted feedback for this project
- **THEN** the system SHALL persist a `project_feedback` row linking the consultant and project, and return `201`

#### Scenario: Project is not finalizado
- **WHEN** a consultant who was assigned to a stage of the project sends `POST /projects/:id/feedback` while the project's `status` is not `'finalizado'`
- **THEN** the system SHALL return `409`

#### Scenario: Consultant was never assigned to the project
- **WHEN** a consultant who was never assigned as `consultant_id` on any stage of the project sends `POST /projects/:id/feedback`
- **THEN** the system SHALL return `403`

#### Scenario: Duplicate feedback submission
- **WHEN** a consultant who already submitted feedback for the project sends `POST /projects/:id/feedback` again
- **THEN** the system SHALL return `409`

#### Scenario: Missing answers
- **WHEN** a consultant sends `POST /projects/:id/feedback` without an `answers` object
- **THEN** the system SHALL return `400`

#### Scenario: Project not found
- **WHEN** a consultant sends `POST /projects/:id/feedback` for a project id that does not exist
- **THEN** the system SHALL return `404`

---

### Requirement: Manager and director can list a project's feedback
The project's manager and directors of sector `projetos` (or a superuser) SHALL be able to retrieve all feedback submitted for a project via `GET /projects/:id/feedback`. Other authenticated users, including consultants who submitted feedback themselves, SHALL NOT be able to list this endpoint's results.

#### Scenario: Manager lists feedback
- **WHEN** the project's manager sends `GET /projects/:id/feedback`
- **THEN** the system SHALL return `200` with all `project_feedback` rows for that project

#### Scenario: Director of projetos lists feedback
- **WHEN** a `diretor` of sector `projetos` sends `GET /projects/:id/feedback`
- **THEN** the system SHALL return `200` with all `project_feedback` rows for that project

#### Scenario: Consultant is forbidden
- **WHEN** a `consultor` (including one who submitted feedback for the project) sends `GET /projects/:id/feedback`
- **THEN** the system SHALL return `403`

#### Scenario: Project not found
- **WHEN** the project's manager sends `GET /projects/:id/feedback` for a project id that does not exist
- **THEN** the system SHALL return `404`

---

### Requirement: A consultant can list their own pending feedback
A `consultor` SHALL be able to list, via `GET /projects/feedback-status`, the ids of every `finalizado` project where they have at least one stage assigned to them and have not yet submitted feedback. Other roles SHALL NOT access this endpoint.

#### Scenario: Consultant has pending feedback
- **WHEN** a consultant who was assigned to a stage of a `finalizado` project sends `GET /projects/feedback-status` and has not submitted feedback for that project
- **THEN** the system SHALL return `200` with `{ pending_feedbacks: [...] }` including that project's id

#### Scenario: Consultant already submitted feedback for a project
- **WHEN** a consultant already submitted feedback for a `finalizado` project they were assigned to
- **THEN** the system SHALL return `200` with `pending_feedbacks` excluding that project's id

#### Scenario: Project is not finalizado yet
- **WHEN** a consultant is assigned to a stage of a project whose `status` is not `'finalizado'`
- **THEN** the system SHALL return `200` with `pending_feedbacks` excluding that project's id

#### Scenario: Consultant has nothing pending
- **WHEN** a consultant has no `finalizado` project with an assigned stage and unsubmitted feedback
- **THEN** the system SHALL return `200` with `{ pending_feedbacks: [] }`

#### Scenario: Non-consultant is forbidden
- **WHEN** a user whose role is not `consultor` sends `GET /projects/feedback-status`
- **THEN** the system SHALL return `403`
