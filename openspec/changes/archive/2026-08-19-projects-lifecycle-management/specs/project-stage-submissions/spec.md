## ADDED Requirements

### Requirement: Assigned consultant can submit a stage's deliverables
The consultant assigned to a stage (`project_stages.consultant_id`) SHALL be able to submit deliverables via `POST /projects/:id/stages/:stageId/submissions`, providing optional completion `notes` and one file per requested deliverable (`{ deliverable_id, path, name }`), but only while the stage's `status` is `'pendente'`. The system SHALL verify every file's `deliverable_id` belongs to the stage's `project_stage_deliverables` checklist, that every checklist deliverable has a corresponding file, and that each file's `path` exists in the `project-stage-files` storage bucket. On success the system SHALL create a `stage_submissions` row (`attempt` incremented from the stage's prior submissions, starting at 1), one `stage_submission_files` row per file, move the stage's `status` to `'em_revisao'`, and notify the project's manager.

#### Scenario: Successful first submission
- **WHEN** the assigned consultant sends `POST /projects/:id/stages/:stageId/submissions` for a `pendente` stage with a file for every deliverable in the stage's checklist, each file path existing in storage
- **THEN** the system SHALL persist a `stage_submissions` row with `attempt = 1`, one `stage_submission_files` row per deliverable, set the stage's `status` to `'em_revisao'`, return `201`, and insert a `notifications` row for the project's manager

#### Scenario: Successful resubmission after rejection
- **WHEN** the assigned consultant sends `POST /projects/:id/stages/:stageId/submissions` for a stage that was previously rejected and is `pendente` again, with a file for every deliverable in the checklist
- **THEN** the system SHALL persist a new `stage_submissions` row with `attempt` incremented from the previous submission and the same behavior as the first submission

#### Scenario: Missing a deliverable file
- **WHEN** the assigned consultant sends `POST /projects/:id/stages/:stageId/submissions` without a file for at least one deliverable in the stage's checklist
- **THEN** the system SHALL return `400` and SHALL NOT persist the submission

#### Scenario: File path not found in storage
- **WHEN** the assigned consultant sends `POST /projects/:id/stages/:stageId/submissions` with a file whose `path` does not exist in the `project-stage-files` bucket
- **THEN** the system SHALL return `400` identifying the missing file

#### Scenario: Requester is not the assigned consultant
- **WHEN** a user other than the stage's assigned `consultant_id` sends `POST /projects/:id/stages/:stageId/submissions`
- **THEN** the system SHALL return `403`

#### Scenario: Stage is not pendente
- **WHEN** the assigned consultant sends `POST /projects/:id/stages/:stageId/submissions` for a stage whose `status` is `'em_revisao'` or `'concluida'`
- **THEN** the system SHALL return `409`

#### Scenario: Stage not found
- **WHEN** a request reaches `POST /projects/:id/stages/:stageId/submissions` with a stage id that does not exist or does not belong to the project
- **THEN** the system SHALL return `404`

---

### Requirement: Authenticated user can list a stage's submissions
Any active authenticated user SHALL be able to list all submission attempts for a stage, ordered by `attempt` descending.

#### Scenario: List submissions
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/submissions`
- **THEN** the system SHALL return `200` with all `stage_submissions` rows for that stage ordered by `attempt DESC`, each including its files

#### Scenario: Stage not found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/submissions` for a stage id that does not exist or does not belong to the project
- **THEN** the system SHALL return `404`

---

### Requirement: Authenticated user can fetch a single submission
Any active authenticated user SHALL be able to retrieve a single submission, including its files with time-limited signed URLs (valid for 1 hour) instead of raw storage paths.

#### Scenario: Submission found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/submissions/:submissionId` with a valid submission id belonging to the stage
- **THEN** the system SHALL return `200` with the submission and a `files` array containing `signed_url` and `name` per file

#### Scenario: Submission not found
- **WHEN** an authenticated user sends `GET /projects/:id/stages/:stageId/submissions/:submissionId` with a submission id that does not exist or does not belong to the stage
- **THEN** the system SHALL return `404`
