## ADDED Requirements

### Requirement: Integration test file location and naming
All API integration tests SHALL live under `src/test/<resource>/METHOD.spec.ts`, where `<resource>` is the plural noun of the route (e.g., `users`, `activities`) and `METHOD` is the HTTP verb in uppercase (e.g., `GET`, `POST`, `PATCH`, `DELETE`).

#### Scenario: GET endpoints share a file
- **WHEN** a resource has both `GET /resource` and `GET /resource/:id`
- **THEN** both are tested in the same `src/test/<resource>/GET.spec.ts` file under separate `describe` blocks

#### Scenario: Mutating methods each have their own file
- **WHEN** a resource has `POST`, `PATCH`, and `DELETE` endpoints
- **THEN** each lives in its own file (`POST.spec.ts`, `PATCH.spec.ts`, `DELETE.spec.ts`)

---

### Requirement: Orchestrator import
Every integration test file SHALL import exclusively from `../orchestrator` (the orchestrator at `src/test/orchestrator.ts`). The old `../../lib/orchestrator` MUST NOT be used.

#### Scenario: Correct import in a new test file
- **WHEN** a new test file is created under `src/test/<resource>/`
- **THEN** it contains `import orchestrator from '../orchestrator'` as its only orchestrator import

---

### Requirement: Per-file database setup
Every integration test file SHALL call `orchestrator.waitForAllServices()` and `orchestrator.database.clear()` inside a top-level `beforeAll`, and MUST NOT call `afterAll` with a database clear.

#### Scenario: File-level beforeAll
- **WHEN** any `*.spec.ts` file is opened under `src/test/`
- **THEN** the first `beforeAll` block calls `await orchestrator.waitForAllServices()` followed by `await orchestrator.database.clear()`

#### Scenario: No afterAll cleanup
- **WHEN** a test file finishes execution
- **THEN** there is no `afterAll(() => orchestrator.database.clear())` call — cleanup is only done at the start of each file

---

### Requirement: Per-test in-test seeding
Each `test()` SHALL create all database entities it needs inline, using `orchestrator.database.seed.*` functions. Tests MUST NOT depend on data created by other tests or by a shared outer `beforeAll` seed.

#### Scenario: Self-contained test
- **WHEN** a test needs a user with a specific role
- **THEN** that test calls `orchestrator.database.seed.createUser(...)` inside its own body before making any HTTP request

#### Scenario: Describe-scoped beforeAll exception
- **WHEN** multiple sibling tests inside the same `describe` block share a user that none of them mutate
- **THEN** a `beforeAll` scoped to that `describe` block MAY create the shared user, provided the user is never modified between those sibling tests

---

### Requirement: Unique email addresses per test
Every user created via `orchestrator.database.seed.createUser` SHALL use an email address guaranteed to be unique within the test run. The recommended pattern is `<role>.<action>.${Date.now()}@watt-test.com`.

#### Scenario: No duplicate email errors
- **WHEN** two tests in the same file both create a user with role `consultor`
- **THEN** their emails differ (e.g., via `Date.now()` or a unique suffix) so neither INSERT conflicts with the other

---

### Requirement: Describe-block structure by role
Each test file SHALL organize tests in `describe` blocks named after the acting user's role: `Authenticated CONSULTOR`, `Authenticated GERENTE`, `Authenticated DIRETOR`, `Authenticated ASSESSOR`, `Authenticated PRESIDENTE`, and `Unauthenticated user`. Roles not applicable to the endpoint MAY be omitted, but all must be considered.

#### Scenario: Role blocks present
- **WHEN** a new spec file is written for a route
- **THEN** it contains at minimum `describe('Unauthenticated user', ...)` and one role-specific describe block for every role that has different behavior on that route

#### Scenario: Non-applicable roles documented
- **WHEN** all authenticated roles receive the same response from a route (e.g., all roles can POST)
- **THEN** a describe block exists for each role with a test confirming the successful behavior, rather than collapsing them into one

---

### Requirement: Mandatory scenario coverage per route
Every integration test file SHALL cover the following scenarios when applicable:

- **Success path**: at least one test per role that is allowed to perform the action, verifying status code and response shape.
- **Unauthenticated (401)**: a test without an `Authorization` header, expecting HTTP 401.
- **Forbidden role (403)**: a test for every role that is NOT permitted to perform the action, expecting HTTP 403.
- **Resource not found (404)**: for routes with `:id` parameters, a test using a valid UUID that does not exist in the database, expecting HTTP 404.
- **Validation error (400)**: for routes with a request body, at least one test sending an invalid or missing required field, expecting HTTP 400.
- **Conflict (409)**: for creation/update routes where uniqueness constraints exist, at least one test triggering the conflict, expecting HTTP 409.

#### Scenario: Unauthenticated request returns 401
- **WHEN** a request is sent to any protected route without an Authorization header
- **THEN** the response status is 401

#### Scenario: Forbidden role returns 403
- **WHEN** a user with insufficient role makes a request to a route they are not permitted to access
- **THEN** the response status is 403

#### Scenario: Non-existent resource returns 404
- **WHEN** a request targets a resource ID that does not exist in the database (use a valid UUID format like `00000000-0000-0000-0000-000000000001`)
- **THEN** the response status is 404

#### Scenario: Invalid body returns 400
- **WHEN** a POST or PATCH request omits a required field or sends an invalid enum value
- **THEN** the response status is 400

---

### Requirement: No module-level unit specs
Unit test files in `src/modules/` (controller, service, guard, interceptor specs) SHALL NOT exist. All testing MUST be performed through the HTTP layer using the integration test pattern.

#### Scenario: Module spec files removed
- **WHEN** the migration is complete
- **THEN** there are no `*.spec.ts` files anywhere under `src/modules/`

#### Scenario: New module spec rejected
- **WHEN** a developer adds a new `*.spec.ts` file under `src/modules/`
- **THEN** the contribution is rejected in code review; the developer MUST write an integration test under `src/test/` instead
