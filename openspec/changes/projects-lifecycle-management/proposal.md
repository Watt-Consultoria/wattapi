## Why

Watt currently has no way to run a consulting project through the API. Managers (`gerente`) need to open a project for a lead, break it into staged deliverables assigned to consultants, and track execution end to end; directors (`diretor`) need a two-tier approval gate (per-stage and whole-project) before a project can be closed; and consultants need to submit deliverables and, after closing, respond with feedback. `PROJECTS.md` and the accompanying flow diagram (`flux.png`) define this end-to-end lifecycle and the suggested schema — this change implements it as a new set of API capabilities.

## What Changes

- Add a `projects` resource: managers create a project against an existing lead and portfolio item, with a name, optional description, and delivery date. Projects move through `em_andamento` → `em_revisao` → `revisado` → `finalizado`.
- Add a `project_stages` resource nested under a project: managers define ordered stages with an optimal delivery date, a hard deadline, a description, a set of required deliverables, and an assigned consultant. Creating a stage notifies the assigned consultant.
- Add a `stage_submissions` resource: the assigned consultant submits completion notes plus a file per requested deliverable. Submitting moves the stage to `em_revisao` and notifies the managing manager.
- Add a `stage_reviews` resource: the manager approves or rejects a submission. Approval moves the stage to `concluida`; rejection moves it back to `pendente`, requires a new delivery date, and records which deliverables must be re-submitted. Either outcome notifies the consultant.
- Add a project-level review flow: the manager marks a project `em_revisao` via `PATCH /projects/:id`, which notifies directors in the `projetos` sector. A director then records approval/rejection via `PATCH /projects/:id/reviews` — approval sets `revisado`, rejection returns the project to `em_andamento` — and the manager is notified either way.
- Add project closing: a director marks a `revisado` project `finalizado` via `PATCH /projects/:id` with closing notes. Closing is terminal (no further modifications) and notifies every consultant who was assigned to any stage of the project, prompting them for feedback.
- Add a `project_feedback` resource: each notified consultant submits one feedback response per project via `POST /projects/:id/feedback`.
- Add the 15 endpoints listed in `PROJECTS.md` under "Endpoints que devem ser criados" (projects CRUD, stages CRUD, submissions, stage reviews, project reviews, feedback).
- Add 2 endpoints beyond the source document to close read gaps left by the write-only flow: `GET /projects/:id/reviews` (director review history — otherwise a project's past rejection rounds are unrecoverable) and `GET /projects/:id/feedback` (manager/director-only; otherwise submitted consultant feedback is unrecoverable).
- Add optional query filters to `GET /projects` (`status`, `lead_id`, `created_by`, `consultant_id`) and `GET /projects/:id/stages` (`consultant_id`, `status`) for data retrieval, following the existing `?selection_process_id=`/`?stage_id=` query-param convention from `selection-process` rather than introducing new routes.

## Capabilities

### New Capabilities

- `projects-crud`: create/list/fetch a project (lead + portfolio validation, `created_by`), and `PATCH /projects/:id` transitions — manager submitting for review, director closing with notes. Status enum and its allowed transitions live here.
- `project-stages`: create/list/fetch/update stages within a project (dates, position, deliverables checklist, assigned consultant) and the notification sent to the consultant on creation.
- `project-stage-submissions`: consultant submits deliverable files + notes for a stage, stage moves to `em_revisao`, manager is notified.
- `project-stage-reviews`: manager approves/rejects a submission, resulting stage status transition, rework bookkeeping (new deadline + deliverables to redo), consultant notification.
- `project-reviews`: director-level review of a project marked `em_revisao` by its manager (`PATCH /projects/:id/reviews`), approval/rejection transitions, manager notification, and readable round history (`GET /projects/:id/reviews`).
- `project-feedback`: consultants who worked any stage of a closed project submit feedback (`POST /projects/:id/feedback`), one response per consultant per project, readable by the project's manager/director (`GET /projects/:id/feedback`).

### Modified Capabilities

None — this introduces a new domain area and does not change the documented behavior of `leads-crud`, `portfolio-crud`, `notifications-crud`, or `notifications-automatic`. Project-triggered notifications are created the same way existing modules already do it (direct insert into `notifications`, mirrored in each new capability's spec).

## Impact

- **Database**: new tables `projects`, `project_stages`, `project_stage_deliverables`, `stage_submissions`, `stage_submission_files`, `stage_reviews`, `stage_review_reworks`, `project_reviews`, `project_feedback`, plus `project_status` / `project_stage_status` enums (per `PROJECTS.md`'s suggested schema, refined in `design.md`). Stage deliverable files are uploaded to Supabase Storage and referenced by path, mirroring `selection-process` and `reimbursements`.
- **API**: new `src/modules/projects` module (controller + service + DTOs), registered in `app.module.ts`. Uses the existing `RoutePolicyGuard`/`RoutePolicy` and `ROLE_RANK` (`consultor` < `gerente` < `diretor`) for access control.
- **Notifications**: reuses the existing `notifications` table/service pattern (direct SQL insert with `origin`), no changes to the `notifications` module itself.
- **Docs**: OpenAPI docs gain the 15 new endpoints (per repo convention of updating docs whenever an endpoint is added).
