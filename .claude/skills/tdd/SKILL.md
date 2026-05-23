---
name: tdd
description: Test-Driven Development workflow. Use when the user wants to implement a feature following TDD — writing failing tests first, confirming RED state, then implementing until GREEN. Works from specs, task descriptions, or plain feature descriptions.
metadata:
  author: wattapi
  version: "1.0"
---

Implement a feature following the Test-Driven Development cycle: RED → GREEN.

**Input**: A feature name, description, or reference to an existing spec (e.g., `openspec/specs/<capability>/spec.md`). If omitted, ask what the user wants to build.

---

## Steps

### 1. Understand the feature

If the user provided a spec file path, read it. If they described the feature in prose, extract the requirements from the description.

Identify:
- **What the feature does** (happy path)
- **Validations** (what inputs should be rejected and with which HTTP status / error)
- **Edge cases** (defaults, boundary values, constraint violations)

If requirements are unclear, use **AskUserQuestion** to clarify before writing any test.

### 2. Locate the correct test file

Determine where the tests should live:
- Follow the existing convention in the project (e.g., `*.controller.spec.ts` alongside the controller, `*.service.spec.ts` alongside the service).
- If a test file already exists for the module, add to it. Do NOT create a new file unless none exists.
- Announce the target file: "Writing tests to: `<path>`"

### 3. Write all tests (RED phase)

Write every test case before touching any implementation code. Tests MUST:

- Cover the **happy path** (correct input → expected output and status code)
- Cover **each validation rule** as a separate test case
- Cover **each edge case** identified in step 1
- Follow the exact same style and helpers already used in the target test file (copy the `describe`/`it` structure, `beforeAll`/`afterAll` hooks, HTTP client, etc.)
- Use **unique, non-colliding test data** per test (different emails, CPFs, IDs, etc.) to avoid order-dependent failures
- Be **atomic**: each `it` block tests exactly one scenario

Add the tests under a new `describe('<METHOD> <route or feature name>', () => { ... })` block appended at the end of the file.

Do NOT write any implementation code during this step.

### 4. Confirm RED state

Run the test suite scoped to the target file:

```bash
npm test -- --testPathPattern=<filename-without-extension>
```

Parse the output:
- **All new tests failing** → RED confirmed, proceed to step 5.
- **Some new tests passing unexpectedly** → stop and investigate. The feature may already be partially implemented, or the tests may have a logic error. Report findings and ask how to proceed.
- **Test runner error** (compile error, missing dependency, etc.) → fix the error (it is part of the RED phase), then re-run until the runner executes and all new tests fail.

Do NOT proceed to implementation until RED is confirmed.

Announce: "RED confirmed — N tests failing. Proceeding to implementation."

### 5. Implement the feature (GREEN phase)

Implement the minimum code required to make the failing tests pass. Work in logical order:

1. Schema / DTO / types
2. Service / business logic
3. Controller / route handler

Keep changes minimal and scoped. Do not refactor unrelated code.

### 6. Confirm GREEN state

Re-run the same scoped test command:

```bash
npm test -- --testPathPattern=<filename-without-extension>
```

Expected outcome:
- **All previously failing tests now pass**
- **No regressions** in tests that existed before this session

If any test still fails, fix the implementation and re-run. Do not modify the tests to make them pass unless the test itself contains a bug (explain the bug before changing it).

Announce: "GREEN — N/N tests passing, 0 regressions."

---

## Output Format

```
## TDD: <feature name>

**Test file:** src/modules/users/users.controller.spec.ts
**Scenarios identified:** N

### RED Phase
Writing N tests... ✓
Running tests...
RED confirmed — N tests failing.

### Implementation
[summary of what was implemented]

### GREEN Phase
Running tests...
GREEN — N/N tests passing, 0 regressions. ✓
```

---

## Guardrails

- **Never write implementation before RED is confirmed.**
- **Never modify tests to force them green** unless there is a genuine bug in the test logic (explain openly before changing).
- **Never skip a scenario** identified in the spec to avoid writing a hard test.
- If the test runner cannot run (Docker not up, server not started, etc.), inform the user and pause. Do not assume RED state.
- If the project uses a real-service integration pattern (fetch + orchestrator), write integration tests in the same style. If it uses unit mocks, follow that pattern instead.
- Use unique data per test to prevent state bleed between test cases.
