## Context

The project has two generations of integration tests:

**Old pattern** (`src/modules/<module>/<module>.controller.spec.ts`):
- Uses `../../lib/orchestrator` which exposes `seedDatabase()` / `clearDatabase()` / `end()`
- One `beforeAll` seeds a fixed set of users once; tests reference them by array index (`seededUsers[0]`, `seededUsers[4]`, etc.)
- `afterAll` clears the database after the whole file
- Tests use `it()` with no role context in the description
- Covers some guard/interceptor/service units in separate `*.spec.ts` files

**New pattern** (`src/test/<route>/METHOD.spec.ts`):
- Uses `../orchestrator` from `src/test/orchestrator.ts`
- `beforeAll` only calls `waitForAllServices()` + `database.clear()` — no shared seeds
- Every individual `test()` seeds its own users/data inline via `orchestrator.database.seed.*`
- Describe blocks are named after roles (`Authenticated CONSULTOR`, `Unauthenticated user`)
- Fully demonstrated in `src/test/reinbursements/`

The old pattern creates invisible coupling: changing a user in `seededUsers[0]` breaks unrelated tests; the describe structure gives no indication of which role is being tested; and the shared teardown makes it impossible to run files in parallel.

## Goals / Non-Goals

**Goals:**
- Remove all old `src/modules/**/*.spec.ts` files
- Create `src/test/<route>/METHOD.spec.ts` files for every API surface not yet under `src/test/`
- Ensure net-increase in scenario coverage (more roles × error paths covered than before)
- Codify the pattern as a spec so future contributors follow it automatically

**Non-Goals:**
- No changes to application source code (controllers, services, guards)
- No changes to CI pipeline or vitest configuration
- No migration of the old `lib/orchestrator.ts` or `lib/seed.ts` — they will simply be unused and can be deleted after migration completes
- No performance or load testing

## Decisions

### Decision 1: Delete old tests immediately, not alongside new ones

**Chosen**: Delete old module specs as part of each task; never run both generations simultaneously.

**Rationale**: Running both would double the test time and risk flaky interactions if they share DB state. The new tests cover a strict superset of the old scenarios.

**Alternative considered**: Keep old tests while new ones are written, delete at the end. Rejected because it extends the window where both generations compete for the same database.

---

### Decision 2: One file per HTTP method, organized by route resource

**Chosen**: `src/test/users/GET.spec.ts`, `src/test/users/POST.spec.ts`, `src/test/users/PATCH.spec.ts`, `src/test/users/DELETE.spec.ts` — mirroring the reimbursements structure.

**Rationale**: Groups semantically similar endpoints (`GET /users` and `GET /users/:id` share a file since both are read operations), while keeping write operations separate. Files stay small and focused. Consistent with `src/test/boilerplate.ts`.

**Alternative considered**: One file per route group (all users in one file). Rejected because a single file covering GET+POST+PATCH+DELETE would be large and harder to navigate.

---

### Decision 3: Per-test seeding with unique emails using `Date.now()`

**Chosen**: Each test creates its own users using unique emails like `role.action.${Date.now()}@watt-test.com`. Tests that need to avoid email collisions within the same file use the timestamp or a suffix counter.

**Rationale**: Tests become fully self-contained. Adding or removing one test never affects another. Matches the pattern already used in `src/test/reinbursements/PATCH.spec.ts`.

**Exception**: Some describe blocks with multiple tests sharing the same user (e.g., ASSESSOR retrieving own vs. all reimbursements) may use a `beforeAll` scoped to that `describe` block — acceptable as long as the data is not mutated between the sibling tests.

---

### Decision 4: Guard/interceptor/service unit specs are removed without replacement

**Chosen**: Delete `jwt.guard.spec.ts`, `route-policy.guard.spec.ts`, `role-serializer.interceptor.spec.ts`, `logging.interceptor.spec.ts`, and all `*.service.spec.ts` files. Their behavior is fully exercised through the HTTP-level integration tests.

**Rationale**: Unit mocks of guards and interceptors only test that NestJS wires things correctly, which is a framework guarantee. Real-value testing is at the HTTP boundary where auth, serialization, and business logic are exercised together.

**Alternative considered**: Keep service specs for pure business logic. Rejected because all business logic in this app is tightly coupled to database state, which is already seeded in integration tests.

## Risks / Trade-offs

- **Email collision within a file**: If a file's `beforeAll` doesn't clear the DB and two tests use the same email string, the second insert will fail. → Mitigation: always use unique emails (timestamp suffix) or scope `beforeAll(clear)` to the top of each file.
- **Test ordering sensitivity**: `beforeAll` runs once per file; if the DB isn't clean at the start, stale rows can interfere. → Mitigation: `beforeAll` always calls `orchestrator.database.clear()` at the top of every file.
- **Longer test runtime**: Per-test seeding is slower than one shared seed. → Accepted trade-off; correctness over speed. Files can be parallelized by vitest's worker pool.
- **lib/orchestrator.ts becomes dead code**: After migration it imports from `lib/seed.ts` which will also be unused. → Both files should be deleted as part of this change to avoid confusion.
