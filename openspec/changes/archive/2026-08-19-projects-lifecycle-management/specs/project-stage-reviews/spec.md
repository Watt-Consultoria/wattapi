## ADDED Requirements

### Requirement: Manager can review a stage submission
The project's manager (or a superuser) SHALL be able to review the current submission of a stage via `POST /projects/:id/stages/:stageId/reviews`, specifying `approved` (boolean) and optional `notes`. Each `stage_submissions` row SHALL receive at most one review. If `approved` is `false`, the request SHALL also include `new_delivery_date` and a non-empty list of `deliverable_id`s that must be resubmitted (`stage_review_reworks`); the system SHALL verify every listed `deliverable_id` belongs to the stage's checklist. On approval, the system SHALL set the stage's `status` to `'concluida'`. On rejection, the system SHALL set the stage's `status` to `'pendente'` and update the stage's `delivery_date` to `new_delivery_date`. Either outcome SHALL notify the submitting consultant.

#### Scenario: Approve a submission
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` with `{ approved: true }` for a stage in `status = 'em_revisao'` whose current submission has no review yet
- **THEN** the system SHALL persist a `stage_reviews` row linked to the submission, set the stage's `status` to `'concluida'`, return `201`, and insert a `notifications` row for the submitting consultant

#### Scenario: Reject a submission with rework items
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` with `{ approved: false, notes: '...', new_delivery_date: '...', deliverable_ids: [...] }` for a stage in `status = 'em_revisao'`
- **THEN** the system SHALL persist a `stage_reviews` row with `approved = false`, persist one `stage_review_reworks` row per listed `deliverable_id`, set the stage's `status` to `'pendente'` and `delivery_date` to `new_delivery_date`, return `201`, and insert a `notifications` row for the submitting consultant

#### Scenario: Rejection missing new_delivery_date
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` with `{ approved: false }` and no `new_delivery_date`
- **THEN** the system SHALL return `400`

#### Scenario: Rejection missing rework deliverables
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` with `{ approved: false, new_delivery_date: '...' }` and an empty or missing `deliverable_ids` list
- **THEN** the system SHALL return `400`

#### Scenario: Rework deliverable not in the stage's checklist
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` with `{ approved: false, ... }` and a `deliverable_ids` entry that is not part of the stage's `project_stage_deliverables`
- **THEN** the system SHALL return `400`

#### Scenario: Stage is not awaiting review
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` for a stage whose `status` is `'pendente'` or `'concluida'`
- **THEN** the system SHALL return `409`

#### Scenario: Submission already reviewed
- **WHEN** the project's manager sends `POST /projects/:id/stages/:stageId/reviews` for a stage whose current submission already has a `stage_reviews` row
- **THEN** the system SHALL return `409`

#### Scenario: Non-manager attempts to review
- **WHEN** a user who is not the project's manager (and not a superuser) sends `POST /projects/:id/stages/:stageId/reviews`
- **THEN** the system SHALL return `403`

---

### Requirement: Authenticated user can list a stage's reviews
Any active authenticated user SHALL be able to list all reviews for a stage, ordered by `reviewed_at` descending, each including its rework deliverables when `approved = false`.

#### Scenario: List reviews
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/reviews`
- **THEN** the system SHALL return `200` with all `stage_reviews` rows for that stage's submissions ordered by `reviewed_at DESC`

#### Scenario: Stage not found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/reviews` for a stage id that does not exist or does not belong to the project
- **THEN** the system SHALL return `404`
