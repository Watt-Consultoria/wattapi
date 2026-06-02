## Why

The existing module-level unit tests rely on a shared `seedDatabase()` / `clearDatabase()` lifecycle and reference seeded users by array index, making them brittle, hard to extend, and unable to express role-based business rules clearly. The new orchestrator pattern already proven in `src/test/reinbursements/` provides a cleaner foundation — per-test in-test seeds, explicit role descriptions, and full HTTP-level coverage — that makes business-rule expectations self-documenting and resilient.

## What Changes

- Delete all `.spec.ts` files under `src/modules/` (controller, service, guard, and interceptor specs) — these are replaced by the new integration tests.
- Create `src/test/<route>/METHOD.spec.ts` files for every API route not yet covered under `src/test/`.
- Each new test file follows the pattern in `src/test/boilerplate.ts` and `src/test/reinbursements/`: `beforeAll` clears the DB, each test seeds its own data via `orchestrator.database.seed.*`, and describe blocks are organized by role then unauthenticated.
- Fix the `src/test/auth/GET.spec.ts` stub (currently empty) with real assertions.
- Add a canonical spec that codifies the integration test convention so future contributors know the required pattern.

## Capabilities

### New Capabilities

- `integration-test-conventions`: Specifies the mandatory pattern for all integration tests in this project — file location, lifecycle hooks, per-test seeding, describe/test structure, and which scenarios must always be covered (success path, unauthenticated, forbidden role, not-found, validation error).

### Modified Capabilities

<!-- No existing spec-level requirements are changing — this migration replaces test infrastructure only. -->

## Impact

- **Files deleted**: all `src/modules/**/*.spec.ts` (controllers, services, guards, interceptors)
- **Files created**: `src/test/auth/GET.spec.ts` (completed), plus new directories and spec files for `users`, `activities`, `notifications`, `time-tracking`, `routine`, `settings`
- **Coverage**: net increase — each new file covers all roles × all HTTP methods × all error paths, replacing scattered it-blocks that shared global state
- **CI**: no changes to pipeline; vitest picks up `src/test/**/*.spec.ts` automatically
- **Dependencies**: no new packages; orchestrator already exports all needed seed helpers
