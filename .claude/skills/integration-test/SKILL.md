---
name: integration-test
description: Write or adapt HTTP integration tests following the wattapi role-based pattern. Use when the user wants to create a new test suite for an endpoint, fill in scenarios for an existing file, or fix a test that doesn't match conventions.
metadata:
  author: wattapi
  version: '1.0'
---

Create or adapt integration tests for a wattapi API route following the role-based
HTTP integration test pattern defined in `src/test/boilerplate.spec.ts`.

**Input**: a route or resource name (e.g. `POST /reimbursements`, `users`, `GET /activities/:id`),
or a path to an existing spec file to be adapted. If the input is ambiguous, ask with AskUserQuestion.

---

## Context you must read before writing

1. **`src/test/boilerplate.spec.ts`** — canonical pattern. Follow it exactly for structure,
   `beforeAll`, email naming, and the scenarios checklist at the bottom.
2. **`src/test/orchestrator.ts`** — the only import allowed. Read it to know which
   `seed.*` helpers are available and their parameter shapes.
3. **The controller** for the target route (under `src/modules/<resource>/<resource>.controller.ts`)
   — read it to understand which roles are guarded, what the route accepts, and what it returns.
4. **The service** (`src/modules/<resource>/<resource>.service.ts`) — read it to understand
   business rules: ownership checks, scope restrictions, what triggers 400/403/404/409.
5. **Existing spec files** for the same resource if they exist — match their style.

---

## Steps

### 1. Identify the target file

Derive the path from the route:

- `src/test/<resource>/<METHOD>.spec.ts`
- `<resource>` = plural noun, lowercase (e.g. `reimbursements`, `users`, `time-entries`)
- `<METHOD>` = HTTP verb, uppercase (e.g. `GET`, `POST`, `PATCH`, `DELETE`, `PUT`)

`GET /resource` and `GET /resource/:id` both go in `GET.spec.ts`.
Every other verb gets its own file.

If the file already exists: open it, read all existing tests, then ADD the missing
scenarios. Never overwrite tests that are already correct.

Announce: "Writing to: `src/test/<resource>/<METHOD>.spec.ts`"

### 2. Analyse the route

Read the controller and service. Extract:

- **Permitted roles** — which roles the guard allows; which are forbidden (403).
- **Request shape** — required fields, optional fields, enum values, constraints.
- **Response shape** — what fields are returned; whether they differ by role (e.g. `cpf` hidden for CONSULTOR).
- **Business rules** — ownership checks, sector scoping, status transitions, uniqueness constraints.
- **Error conditions** — what triggers 400, 403, 404, 409.

### 3. Plan the test matrix

Build a mental grid: `role × scenario`. Every cell is a test case.

Mandatory scenarios (skip only when the route genuinely cannot trigger them):

| Status          | When to include                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| **200/201/204** | For every role that has permission — verify status code AND critical response fields                          |
| **400**         | At least one test: missing required field or invalid enum value                                               |
| **401**         | Always — request with no `Authorization` header                                                               |
| **403**         | For every role that is explicitly blocked, OR for ownership violations (e.g. editing another user's resource) |
| **404**         | For any route with an `:id` param — use `00000000-0000-0000-0000-000000000001`                                |
| **409**         | When the route has a uniqueness constraint (e.g. duplicate email, duplicate slot)                             |

Validation errors (400) and conflict errors (409) may be placed in any role block —
prefer `PRESIDENTE` or the lowest-privilege permitted role to avoid repetition.

### 4. Write the file

Follow `src/test/boilerplate.spec.ts` exactly. Rules:

```
import orchestrator from '../orchestrator';   ← only allowed import

const BASE_URL = 'http://localhost:3001/<resource>';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});
```

- **No `afterAll`** — cleanup is always done at the start of the next run.
- **No shared seeds** in an outer `beforeAll` — each `test()` creates its own data.
  - Exception: a `beforeAll` scoped inside a `describe` block is fine when multiple
    sibling tests share a non-mutated user.
- **Unique emails every time**: `role.action.${Date.now()}@watt-test.com`
  - For multiple users created in the same test use distinguishing suffixes:
    `...consultor.owner.${Date.now()}@watt-test.com` vs `...consultor.actor.${Date.now()}@watt-test.com`
- **Role blocks in this order**: CONSULTOR → GERENTE → DIRETOR → ASSESSOR → PRESIDENTE → Unauthenticated user
- **One banner per top-level route**:
  ```
  // ─── GET /resource ───────────────────────────────────────────────────────────
  ```
- **Type-cast response bodies** — always `(await response.json()) as MyType` with a local type alias at the top of the file.
- **Assert shape, not just status** on happy-path tests: check the key fields of the
  response body, not just `response.status`.

#### Seeding reference

```ts
orchestrator.database.seed.createUser({ username, email, password: '', role, sector? })
// role: consultor | gerente | diretor | assessor | presidente
// sector: comercial | projetos | institucional | executivo | financeiro | rh

orchestrator.database.seed.createActivity({ user_id, name?, description?, date?, time_start?, time_end?, priority? })
orchestrator.database.seed.createNotification({ user_id, title?, description?, origin?, created_by? })
orchestrator.database.seed.createRoutineSlot({ user_id, day?, hour? })
orchestrator.database.seed.createTimeEntry({ user_id, clocked_in_at?, clocked_out_at? })
orchestrator.database.seed.createReimbursement({ user_id, title?, description?, amount_cents?, category?, pix_key? })
orchestrator.database.seed.uploadFile(userId, filename)   // → storagePath string
```

### 5. Adapting an existing file

When asked to adapt (not create from scratch):

1. Read the existing file completely.
2. Identify which tests are missing from the mandatory matrix.
3. Identify tests that violate conventions (shared seeds, wrong import, missing `beforeAll`, reused emails).
4. Add missing tests at the end of the relevant `describe` block.
5. Fix convention violations in place — do NOT rewrite working tests.
6. If a role block is completely missing, add it in the correct order.

Never remove existing tests unless they are provably wrong (wrong status code, wrong assertion).

### 6. Verify structure

Before finishing, mentally check:

- [ ] `import orchestrator from '../orchestrator'` is the only orchestrator import
- [ ] `beforeAll` calls `waitForAllServices()` then `database.clear()` at file level
- [ ] No `afterAll` cleans the database
- [ ] Every `test()` seeds its own data
- [ ] Every email uses `${Date.now()}` or another unique suffix
- [ ] `Unauthenticated user` block exists with a 401 test
- [ ] Every role that can be forbidden has a 403 test
- [ ] Every `:id` route has a 404 test with `00000000-0000-0000-0000-000000000001`
- [ ] Every write route has at least one 400 test

---

## Output format

```
## Integration test: <METHOD> <route>

**File:** src/test/<resource>/<METHOD>.spec.ts
**Action:** created | extended | adapted

### Roles covered
- CONSULTOR — <scenarios listed>
- GERENTE   — <scenarios listed>
- DIRETOR   — <scenarios listed>
- ASSESSOR  — <scenarios listed>
- PRESIDENTE — <scenarios listed>
- Unauthenticated — 401

### Scenarios added / changed
- <summary of what was written or fixed>

### Scenarios not covered (and why)
- <anything skipped with the reason>
```

---

## Guardrails

- **Never delete existing, correctly written tests** — only add or fix.
- **Never use `../../lib/orchestrator`** — it is the old pattern and must not appear.
- **Never add `afterAll` database cleanup** — it breaks parallel file execution.
- **Never share mutable data between tests** — each test must be able to run in any order.
- If a required seed helper does not exist in `orchestrator.ts`, stop and report it — do NOT
  write raw SQL inside the test file.
- If the controller/service code is ambiguous about a business rule, use AskUserQuestion
  before inventing behavior.
