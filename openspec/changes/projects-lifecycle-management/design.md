## Context

`PROJECTS.md` and `flux.png` describe a 7-step project lifecycle across three roles (`gerente`, `consultor`, `diretor`) and propose a schema. This is a cross-cutting change (7 new tables, 1 new module, 15 endpoints, 6 notification triggers) with a state machine spanning two entities (`projects`, `project_stages`), so it needs decisions written down before `tasks.md` is generated. The suggested SQL in `PROJECTS.md` has a few bugs (see Decisions) that must be fixed rather than copied verbatim.

Existing modules that this change follows for conventions: `selection-process` (single module, one controller/service, many nested sub-resources, inline notification/email side effects) and `reimbursements` (file-attachment-backed submission with Supabase Storage + signed URLs).

## Goals / Non-Goals

**Goals:**
- Implement all 15 endpoints from `PROJECTS.md`'s endpoint list against the corrected schema.
- Enforce every status transition exactly as described in the flow (`em_andamento → em_revisao → revisado → finalizado` for projects; `pendente → em_revisao → concluida`, with rejection returning to `pendente`, for stages).
- Fire the 6 notifications described in `PROJECTS.md` (`OBS:` lines) using the existing direct-insert pattern.
- Follow existing RBAC conventions (`RoutePolicy` + `ROLE_RANK`) rather than inventing a new authorization mechanism.

**Non-Goals:**
- No changes to `leads`, `portfolio`, `notifications`, or `users` modules — they are only referenced (FKs, read queries).
- No real-time notification delivery (push/websocket) beyond inserting the `notifications` row — push delivery is out of scope, same as every other module that inserts notifications today.
- No generic "edit any project field" endpoint. `PATCH /projects/:id` only performs the two documented state transitions (see Decision 3).
- No admin UI/frontend work.

## Decisions

### 1. One `ProjectsModule`, not one module per capability
Even though the proposal splits specs into 6 capabilities (`projects-crud`, `project-stages`, `project-stage-submissions`, `project-stage-reviews`, `project-reviews`, `project-feedback`), the implementation is a single NestJS module (`src/modules/projects/{projects.controller.ts, projects.service.ts, projects.module.ts, dto/*}`), mirroring `selection-process` (one module backing 4 spec capabilities). All resources share the same `projects` FK chain and DB connection/transaction needs; splitting into separate NestJS modules would add cross-module dependency wiring for no benefit. Sections inside the controller/service are separated with `// ─── Stages ───` style comments, matching `selection-process.controller.ts`.

### 2. Fix the schema bugs in `PROJECTS.md` before implementing
The suggested SQL has copy-paste errors that would not run or would reference the wrong table:
- `project_type_id` is missing its `UUID` type.
- `stage_submissions.stage_id` references `public.stages(id)` — no such table; must reference `public.project_stages(id)`.
- `stage_review_reworks` PK references `checklist_item_id`, a column that was never declared — the declared column is `deliverable_id`; PK becomes `(review_id, deliverable_id)`, and its FK target `public.stage_deliverables(id)` must be `public.project_stage_deliverables(id)`.
- `project_reviews` declares `round`, `approved`, `notes`, `reviewer_id` twice (once inline before `id`'s sibling columns, once again as separate lines) — collapse to one clean column list: `id, project_id, round, approved, notes, reviewer_id, reviewed_at`, with `UNIQUE (project_id, round)` kept.
- All tables get `updated_at timestamptz` only where `PROJECTS.md` shows it (`projects`, `project_stages`) — the other tables are append-only/immutable once created, consistent with `stage_reviews`/`project_reviews` having no `updated_at` in the source doc.

Enum types (`project_status`, `project_stage_status`) are created via `CREATE TYPE ... AS ENUM` as `PROJECTS.md` specifies, rather than `TEXT + CHECK` (used by `reimbursements.status`). Both patterns exist in the codebase already; following the doc's explicit suggestion here avoids a divergence with no other motivation.

### 3. `PATCH /projects/:id` is a state-transition endpoint, not a generic field editor
`PROJECTS.md` only describes two writes through this endpoint: the manager moving `em_andamento → em_revisao` (Etapa 5) and the director moving `revisado → finalizado` with `closing_notes` (Etapa 6). There is no described use case for editing `name`/`description`/`delivery_date` after creation. The DTO accepts an optional `status` (`'em_revisao' | 'finalizado'`) and optional `closing_notes` (required when `status = 'finalizado'`); the service validates the caller's role against the requested transition and the project's current status:
- `em_andamento → em_revisao`: caller must be the project's manager (or a superuser), all of the project's stages must be `concluida` (guarantees "todas as etapas do projeto foram executadas" from Etapa 5), triggers a notification to every `diretor` in sector `projetos`.
- `revisado → finalizado`: caller must be role `diretor` sector `projetos` (or a superuser), `closing_notes` required, triggers one notification per distinct consultant assigned to any stage of the project.
Any other requested transition (e.g. skipping straight to `finalizado`, or a non-manager requesting `em_revisao`) is rejected with `409`/`403` as appropriate.

**Alternative considered**: separate endpoints (`POST /projects/:id/submit-for-review`, `POST /projects/:id/close`) instead of overloading `PATCH`. Rejected because `PROJECTS.md` explicitly names `PATCH /projects/:id` for both actions and it is already in the fixed endpoint list — introducing new endpoints would diverge from the spec document without a clear benefit.

### 4. Stage rejection requires a full re-submission, not a partial diff
On `POST /projects/:id/stages/:id/reviews` with `approved: false`, the manager supplies `new_delivery_date` and the list of `deliverable_id`s that need rework (`stage_review_reworks`). The flow diagram's "GERENTE especifica alterações" step re-sends the *full* `Entregáveis solicitados` list to the consultant, not just a diff — so the next `stage_submissions` attempt (new row, `attempt = attempt + 1`, enforced by the existing `UNIQUE (stage_id, attempt)` constraint) must still include a `stage_submission_files` row for every deliverable in `project_stage_deliverables`, not only the ones flagged in `stage_review_reworks`. `stage_review_reworks` is bookkeeping/visibility (which items specifically changed) rather than a partial-validation whitelist.

### 5. File storage follows the `selection-process` / `reimbursements` pattern — byte-for-byte, not just "similar"
Deliverable files are uploaded by the client directly to a new Supabase Storage bucket (`project-stage-files`) before calling `POST /.../submissions`; the endpoint receives `{ deliverable_id, path, name }` per file and returns signed URLs (1 hour, same TTL as `reimbursements`/`selection-process`) on read.

File-existence validation MUST reuse the exact check both `ReimbursementsService` (`reimbursements.service.ts:42-54`) and `SelectionProcessService.validateFileExists` (`selection-process.service.ts:1191-1203`) already use — not a different mechanism (no `download`, no `getPublicUrl`, no HEAD request):

```typescript
const parts = path.split('/');
const filename = parts.pop()!;
const dir = parts.join('/');
const { data, error } = await this.db.client.storage
  .from(BUCKET) // 'project-stage-files'
  .list(dir, { search: filename });
if (error || !data?.find((f) => f.name === filename)) {
  throw new BadRequestException(`Arquivo não encontrado no storage: ${label}`);
}
```

This runs once per deliverable file in the submission payload, same as `SelectionProcessService.createApplication` validates its three file paths individually before persisting.

**Alternative considered**: extracting this into a shared `src/common` helper now that it would have 3 call sites. Rejected for this change — the pattern is already duplicated twice in the codebase with no shared helper, so introducing one here would touch `reimbursements`/`selection-process` (out of this change's declared scope) for a refactor nobody asked for. Worth a follow-up cleanup change if desired, not bundled here.

### 6. Access control mapping (`RoutePolicy` constants)
Following the `LEADS_ACCESS` / `ADMIN_ACCESS` precedent of OR-ing a superuser bypass with the specific role/sector condition:
- `MANAGER_ACCESS`: `['role', ['assessor', 'presidente']]` OR `['role', ['gerente']]` — project creation, stage creation/update, submission review.
- `PROJECT_DIRECTOR_ACCESS`: `['role', ['assessor', 'presidente']]` OR `['role AND sector', { roles: ['diretor'], sectors: ['projetos'] }]` — project review and closing.
- `ANY_AUTH`: all `GET` list/detail endpoints, stage submission (ownership checked in the service — requester must be the stage's `consultant_id`), and feedback submission (ownership checked in the service — requester must have been assigned to a stage of the project).
Service-layer ownership checks (not just route-level RBA) are required because "the assigned consultant" and "the project's manager" are per-row facts the route policy layer cannot express.

### 7. Two read endpoints and two filter sets beyond `PROJECTS.md`'s list
`PROJECTS.md`'s endpoint list is write-oriented for the review/feedback flows — `PATCH /projects/:id/reviews` and `POST /projects/:id/feedback` have no corresponding `GET`, which makes the data they create unrecoverable through the API. This change adds:
- `GET /projects/:id/reviews` (`ANY_AUTH`, same as `GET .../stages/:stageId/reviews`) — lists `project_reviews` rows for a project ordered by `round DESC`. Read access is unrestricted like every other review-history endpoint in the codebase (`selection-process` interview evaluations, stage reviews here) — the content is procedural, not sensitive.
- `GET /projects/:id/feedback` (`MANAGER_ACCESS` OR `PROJECT_DIRECTOR_ACCESS`, NOT `ANY_AUTH`) — lists `project_feedback` rows for a project. Unlike review notes, feedback answers are a consultant's opinion on how the project was run; restricting read access to the project's manager and directors of sector `projetos` avoids exposing that to arbitrary authenticated users (including other consultants on the same project).
- Optional query filters on `GET /projects` (`status`, `lead_id`, `created_by`, `consultant_id`) and `GET /projects/:id/stages` (`consultant_id`, `status`), all combinable with `AND`. `consultant_id` on `GET /projects` matches projects where the given user is `consultant_id` on at least one stage (a `WHERE EXISTS` against `project_stages`). This follows the existing `?selection_process_id=`/`?stage_id=` filter convention in `selection-process.controller.ts` rather than inventing new routes like `/projects/mine`.

**Alternative considered**: a dedicated `GET /projects/mine` (mirroring `selection-process`'s `getMySlots`). Rejected — `getMySlots` exists because "my slots" mixes two different concepts (owned vs. paired) that don't fit a flat filter; `consultant_id`/`created_by` on `GET /projects` are plain equality filters with no such asymmetry, so a query param is simpler and composes with the other filters (e.g. "my projects that are `em_andamento`").

## Risks / Trade-offs

- **[Risk]** Overloading `PATCH /projects/:id` for two very different transitions (manager submit-for-review vs. director close) makes the handler branch heavily on role + requested status → **Mitigation**: keep the branching entirely in the service (`transitionProject`), covered by dedicated unit/integration scenarios per transition; the controller stays a thin pass-through like every other module.
- **[Risk]** `project_stage_deliverables` has no `updated_at`/versioning, so if a manager edits a stage's deliverable checklist after a rejected submission, in-flight `stage_review_reworks` rows could point at a since-changed checklist item → **Mitigation**: out of scope for this change (`PROJECTS.md` does not describe editing deliverables after stage creation); documented as an open question below.
- **[Risk]** Notifying "every consultant who was assigned to any stage" on project closing requires a `DISTINCT` query across `project_stages`, which is fine at expected project sizes but is an extra join at close time → **Mitigation**: negligible — stage counts per project are small (single digits), no pagination/batching needed.

## Migration Plan

1. Single migration file `<timestamp>_create-projects-tables.sql` creating both enums and all 7 tables in FK-dependency order (`projects` → `project_stages` → `project_stage_deliverables` → `stage_submissions` → `stage_submission_files` → `stage_reviews` → `stage_review_reworks`; `project_reviews` and `project_feedback` depend only on `projects`).
2. Create the `project-stage-files` Supabase Storage bucket (private, same access pattern as `selection-process-files`/`reimbursement-receipts`).
3. Add `src/modules/projects/*` and register `ProjectsModule` in `app.module.ts`.
4. Update `API.md`/OpenAPI per repo convention whenever an endpoint is added.
5. Rollback: drop the new module registration and the migration (tables are additive and unreferenced by any existing table, so a `DROP TABLE ... CASCADE` migration is a safe rollback if needed pre-release).

## Open Questions

- Should a manager be allowed to edit a stage's deliverable checklist or dates after creation but before any submission exists? `PROJECTS.md` gives stages a full `PATCH /projects/:id/stages/:id` endpoint but only documents the position/date/consultant fields — deliverable-list mutation after creation is left open and out of scope here (tasks.md will implement `PATCH` for the scalar stage fields only, not deliverables).
- What happens to a project's stages/submissions once the project is `finalizado`? `PROJECTS.md` says the project "não recebe mais modificações" — this change enforces that at the project level (`PATCH /projects/:id` and `.../stages/:id` reject once the parent project is `finalizado`), but this should be confirmed with the user before archiving the change.
