## 1. Foundation (schema, storage, module scaffold)

- [x] 1.1 Write migration `<timestamp>_create-projects-tables.sql` creating `project_status` and `project_stage_status` enums and the tables `projects`, `project_stages`, `project_stage_deliverables`, `stage_submissions`, `stage_submission_files`, `stage_reviews`, `stage_review_reworks`, `project_reviews`, `project_feedback` — using the corrected schema from `design.md` Decision 2 (fixed `project_type_id` type, `stage_submissions.stage_id` FK target, `stage_review_reworks` PK/FK, deduplicated `project_reviews` columns).
- [x] 1.2 Apply the migration locally and confirm all FKs resolve (`supabase db reset` or project's equivalent migration command).
- [x] 1.3 Create the `project-stage-files` Supabase Storage bucket (private), matching the setup of `selection-process-files` / `reimbursement-receipts`.
- [x] 1.4 Scaffold `src/modules/projects/` (`projects.module.ts`, `projects.controller.ts`, `projects.service.ts`, `dto/project.dto.ts`, `dto/project.response.dto.ts`) with an empty controller/service, and register `ProjectsModule` in `app.module.ts`.
- [x] 1.5 Add `RoutePolicy` constants `MANAGER_ACCESS` and `PROJECT_DIRECTOR_ACCESS` in `projects.controller.ts` per `design.md` Decision 6.
- [x] 1.6 Add test seed helpers to `src/test/orchestrator.ts`: `createProject`, `createProjectStage`, `createStageSubmission`, `createStageReview`, `createProjectReview`, `createProjectFeedback`, and `uploadProjectStageFile` (uploads into the `project-stage-files` bucket, following the existing `uploadFile` pattern). Export them from the `seed` object.

## 2. Projects CRUD — create, list, get

- [x] 2.1 (RED) Create `src/test/projects/POST.spec.ts` and `src/test/projects/GET.spec.ts` covering the scenarios in `specs/projects-crud/spec.md` for `POST /projects`, `GET /projects` (including the `status`/`lead_id`/`created_by`/`consultant_id` filters and their combination), `GET /projects/:id` using the `integration-test` skill. Run `npm test` and confirm these fail (endpoints don't exist yet).
- [x] 2.2 (GREEN) Implement `CreateProjectDto`, `ProjectListQueryDto` (`status?`, `lead_id?`, `created_by?`, `consultant_id?`), `ProjectResponseDto`, and `ProjectsService.create/findAll/findById`, validating `lead_id` against `leads` and `project_type_id` against `portfolio_items`. `findAll` builds its `WHERE` clause from whichever filters are present (AND-combined) and uses `WHERE EXISTS (SELECT 1 FROM project_stages ps WHERE ps.project_id = p.id AND ps.consultant_id = $n)` for `consultant_id`. Wire up `POST /projects`, `GET /projects`, `GET /projects/:id` in the controller with `MANAGER_ACCESS` (create) / `ANY_AUTH` (reads).
- [x] 2.3 Run `npm test` again and confirm the tests from 2.1 now pass.
- [x] 2.4 Update `API.md` / OpenAPI docs for `POST /projects`, `GET /projects` (including query params), `GET /projects/:id`.

### Testing
- File: `src/test/projects/POST.spec.ts` — GERENTE success (201), missing fields (400), unknown `lead_id` (404), unknown `project_type_id` (404), CONSULTOR/DIRETOR forbidden (403), unauthenticated (401).
- File: `src/test/projects/GET.spec.ts` — list all (200), filter by `status` (200, scoped), filter by `lead_id` (200, scoped), filter by `created_by` (200, scoped), filter by `consultant_id` (200, scoped to projects with a matching stage), combined filters (200, intersection), get by id (200), get unknown id (404), unauthenticated (401).

- [x] 2.5 (follow-up, post-review) Add `GET /projects/lookups` (`MANAGER_ACCESS`) — combined lookup endpoint (`leads` filtered to `status = 'em_progresso'`, all `portfolio_items`, active `projetos`-sector `consultants`) so the frontend can build the project-creation modal in one call, without depending on `GET /leads` (gated by `LEADS_ACCESS`, which a `projetos` `gerente` doesn't satisfy). Registered before `GET /projects/:id` to avoid the dynamic segment swallowing the literal `lookups` path. Documented in `specs/projects-crud/spec.md` and `API.md`.
  - File: `src/test/projects/lookups/GET.spec.ts` — GERENTE success scoped correctly on all 3 lists (200), ASSESSOR superuser bypass (200), CONSULTOR/DIRETOR forbidden (403), unauthenticated (401).

## 3. Projects CRUD — status transitions (submit for review, close)

- [x] 3.1 (RED) Create `src/test/projects/PATCH.spec.ts` covering the transition scenarios in `specs/projects-crud/spec.md` (`em_revisao` submission and `finalizado` closing, plus the immutability requirement). Confirm it fails against the still-unimplemented `PATCH /projects/:id`.
- [x] 3.2 (GREEN) Implement `UpdateProjectDto` (`status`, `closing_notes`) and `ProjectsService.transitionProject`, enforcing: manager-only + all-stages-`concluida` for `em_revisao`; director-of-`projetos`-only + `revisado`-only + required `closing_notes` for `finalizado`; reject any transition once `finalizado`. Insert the two notification batches (directors of sector `projetos`; distinct consultants across the project's stages) per `specs/projects-crud/spec.md`.
- [x] 3.3 Run `npm test` and confirm the tests from 3.1 now pass.
- [x] 3.4 Update `API.md` / OpenAPI docs for `PATCH /projects/:id`.

### Testing
- File: `src/test/projects/PATCH.spec.ts` — manager submits with all stages concluida (200 + director notifications), submit blocked when a stage isn't concluida (409), submit by non-manager (403), director closes a `revisado` project with notes (200 + consultant notifications), close without `closing_notes` (400), close a non-`revisado` project (409), close by non-director (403), any PATCH on a `finalizado` project (409).

## 4. Project stages — create, list, get, update

- [x] 4.1 (RED) Create `src/test/projects/stages/POST.spec.ts`, `GET.spec.ts`, `PATCH.spec.ts` covering `specs/project-stages/spec.md`, including the `consultant_id`/`status` filters on `GET`. Confirm failure.
- [x] 4.2 (GREEN) Implement `CreateStageDto`, `UpdateStageDto`, `StageListQueryDto` (`consultant_id?`, `status?`), `StageResponseDto`, and `ProjectsService.createStage/findStages/findStageById/updateStage`, including deliverables persistence, date validations, consultant existence check, and the stage-creation notification. Wire up `POST/GET /projects/:id/stages`, `GET/PATCH /projects/:id/stages/:stageId` with `MANAGER_ACCESS` (write) / `ANY_AUTH` (read).
- [x] 4.3 Run `npm test` and confirm the tests from 4.1 now pass.
- [x] 4.4 Update `API.md` / OpenAPI docs for the 4 stage endpoints (including the `GET` query params).

### Testing
- File: `src/test/projects/stages/POST.spec.ts` — GERENTE success + consultant notified (201), `delivery_date >= deadline_date` (400), stage `delivery_date` after project `delivery_date` (400), empty `deliverables` (400), unknown `consultant_id` (404), project not `em_andamento` (409), non-manager forbidden (403), unauthenticated (401).
- File: `src/test/projects/stages/GET.spec.ts` — list ordered by position (200), filter by `consultant_id` (200, scoped), filter by `status` (200, scoped), get by id with deliverables (200), unknown stage (404).
- File: `src/test/projects/stages/PATCH.spec.ts` — manager updates a `pendente` stage (200), reassigning consultant notifies the new consultant, update on non-`pendente` stage (409), non-manager forbidden (403), unknown stage (404).

## 5. Stage submissions

- [x] 5.1 (RED) Create `src/test/projects/stages/submissions/POST.spec.ts` and `GET.spec.ts` covering `specs/project-stage-submissions/spec.md`. Confirm failure.
- [x] 5.2 (GREEN) Implement `CreateSubmissionDto`, `SubmissionResponseDto`, and `ProjectsService.createSubmission/findSubmissions/findSubmissionById`, validating deliverable coverage against the checklist, incrementing `attempt`, moving the stage to `em_revisao`, notifying the project's manager, and returning signed URLs (1 hour) on read. File-existence validation MUST use the exact `storage.from('project-stage-files').list(dir, { search: filename })` + `data?.find(...)` check copied verbatim from `SelectionProcessService.validateFileExists` (`selection-process.service.ts:1191-1203`) / `ReimbursementsService.create` (`reimbursements.service.ts:42-54`) — see `design.md` Decision 5, do not implement a different check. Wire up the 3 submission endpoints with `ANY_AUTH` + service-level ownership check (requester must be the stage's `consultant_id`) for the `POST`.
- [x] 5.3 Run `npm test` and confirm the tests from 5.1 now pass.
- [x] 5.4 Update `API.md` / OpenAPI docs for the 3 submission endpoints.

### Testing
- File: `src/test/projects/stages/submissions/POST.spec.ts` — assigned consultant success with signed-URL-eligible files (201 + manager notified), resubmission after rejection increments `attempt` (201), missing a deliverable file (400), file path not found in storage (400), non-assigned consultant forbidden (403), stage not `pendente` (409), unknown stage (404), unauthenticated (401).
- File: `src/test/projects/stages/submissions/GET.spec.ts` — list ordered by attempt desc (200), get by id with signed URLs (200), unknown submission (404).

## 6. Stage reviews

- [x] 6.1 (RED) Create `src/test/projects/stages/reviews/POST.spec.ts` and `GET.spec.ts` covering `specs/project-stage-reviews/spec.md`. Confirm failure.
- [x] 6.2 (GREEN) Implement `CreateStageReviewDto`, `StageReviewResponseDto`, and `ProjectsService.createStageReview/findStageReviews`, enforcing one review per submission, approve → `concluida`, reject → `pendente` + `delivery_date` update + `stage_review_reworks` rows, and the consultant notification. Wire up with `MANAGER_ACCESS` (write) / `ANY_AUTH` (read).
- [x] 6.3 Run `npm test` and confirm the tests from 6.1 now pass.
- [x] 6.4 Update `API.md` / OpenAPI docs for the 2 stage-review endpoints.

### Testing
- File: `src/test/projects/stages/reviews/POST.spec.ts` — manager approves (201, stage → `concluida`, consultant notified), manager rejects with rework items (201, stage → `pendente`, new `delivery_date` applied, consultant notified), reject missing `new_delivery_date` (400), reject missing/empty `deliverable_ids` (400), rework deliverable not in checklist (400), stage not `em_revisao` (409), submission already reviewed (409), non-manager forbidden (403).
- File: `src/test/projects/stages/reviews/GET.spec.ts` — list ordered by `reviewed_at` desc (200), unknown stage (404).

## 7. Project reviews (director)

- [x] 7.1 (RED) Create `src/test/projects/reviews/PATCH.spec.ts` and `GET.spec.ts` covering `specs/project-reviews/spec.md`, including the review-history listing. Confirm failure.
- [x] 7.2 (GREEN) Implement `ProjectReviewDto`, `ProjectReviewResponseDto`, and `ProjectsService.reviewProject/findProjectReviews`, incrementing `round` per project, approve → `revisado`, reject → `em_andamento`, and notifying the project's manager. Wire up `PATCH /projects/:id/reviews` with `PROJECT_DIRECTOR_ACCESS` and `GET /projects/:id/reviews` with `ANY_AUTH`, ordered by `round DESC`.
- [x] 7.3 Run `npm test` and confirm the tests from 7.1 now pass.
- [x] 7.4 Update `API.md` / OpenAPI docs for `PATCH /projects/:id/reviews` and `GET /projects/:id/reviews`.

### Testing
- File: `src/test/projects/reviews/PATCH.spec.ts` — director of `projetos` approves (200, project → `revisado`, manager notified), director rejects (200, project → `em_andamento`, manager notified), missing `notes` (400), project not `em_revisao` (409), non-director forbidden (403), unknown project (404).
- File: `src/test/projects/reviews/GET.spec.ts` — list rounds ordered by `round DESC` (200), empty array when never reviewed (200), unknown project (404).

## 8. Project feedback

- [x] 8.1 (RED) Create `src/test/projects/feedback/POST.spec.ts` and `GET.spec.ts` covering `specs/project-feedback/spec.md`, including the manager/director-only listing and the consultant-forbidden case. Confirm failure.
- [x] 8.2 (GREEN) Implement `SubmitFeedbackDto`, `ProjectFeedbackResponseDto`, and `ProjectsService.submitFeedback/findProjectFeedback`, checking the requester was assigned to at least one stage of the project, the project is `finalizado`, and there is no prior feedback row for that consultant/project pair. Wire up `POST /projects/:id/feedback` with `ANY_AUTH` + service-level ownership check, and `GET /projects/:id/feedback` with `MANAGER_ACCESS` OR `PROJECT_DIRECTOR_ACCESS` (consultants, including ones who submitted feedback, get `403`).
- [x] 8.3 Run `npm test` and confirm the tests from 8.1 now pass.
- [x] 8.4 Update `API.md` / OpenAPI docs for `POST /projects/:id/feedback` and `GET /projects/:id/feedback`.

### Testing
- File: `src/test/projects/feedback/POST.spec.ts` — assigned consultant on a `finalizado` project succeeds (201), project not `finalizado` (409), consultant never assigned to the project (403), duplicate submission (409), missing `answers` (400), unknown project (404), unauthenticated (401).
- File: `src/test/projects/feedback/GET.spec.ts` — manager lists feedback (200), director of `projetos` lists feedback (200), consultor forbidden even if they submitted feedback (403), unknown project (404).
- File: `src/test/projects/feedback-status/GET.spec.ts` — consultant with an assigned stage on a `finalizado` project and no feedback yet (200, id included), already submitted (200, id excluded), project not `finalizado` (200, id excluded), no stage assigned (200, id excluded), nothing pending (200, `[]`), non-consultant forbidden (403), unauthenticated (401).

- [x] 8.5 (follow-up, post-review) ~~Add `GET /projects/:id/feedback/me`~~ Replaced by `GET /projects/feedback-status` (`consultor`-only): returns `{ pending_feedbacks: string[] }`, the ids of every `finalizado` project where the caller has a stage assigned and hasn't submitted feedback yet. Documented in `specs/project-feedback/spec.md` and `API.md`.

## 9. Finish

- [x] 9.1 Run `rtk lint` (or the project's ESLint command) on all files under `src/modules/projects/`, `src/test/projects/`, and `src/test/orchestrator.ts`; fix any violations.
- [x] 9.2 Run `npm test` for the full suite and confirm everything is green, including the new files from tasks 2–8.
- [x] 9.3 Confirm `API.md` / OpenAPI now documents all 15 endpoints listed in `PROJECTS.md`'s "Endpoints que devem ser criados" section, plus the 2 added in this change (`GET /projects/:id/reviews`, `GET /projects/:id/feedback`) and the query-filter additions to `GET /projects` and `GET /projects/:id/stages`.
