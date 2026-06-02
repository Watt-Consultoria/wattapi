## 1. Remove Old Test Infrastructure

- [x] 1.1 Delete all guard and interceptor unit specs: `src/common/guards/jwt.guard.spec.ts`, `src/common/guards/route-policy.guard.spec.ts`, `src/common/interceptors/role-serializer.interceptor.spec.ts`, `src/common/interceptors/logging.interceptor.spec.ts`
- [x] 1.2 Delete all service unit specs: `src/modules/activities/activities.service.spec.ts`, `src/modules/notifications/notifications.service.spec.ts`, `src/modules/settings/settings.service.spec.ts`, `src/modules/time-tracking/time-tracking.service.spec.ts`, `src/modules/reimbursements/reimbursements.service.spec.ts`
- [x] 1.3 Delete `src/modules/status/status.controller.spec.ts`

## 2. Auth — `GET /auth/me`

- [x] 2.1 Complete `src/test/auth/GET.spec.ts` (currently a stub): add `import orchestrator from '../orchestrator'`, `beforeAll(waitForAllServices + clear)`, and tests covering every role for the happy path (200 + correct profile shape), unauthenticated (401), auth-only user with no profile row (404 or 401 depending on spec), and expired/invalid token (401)
- [x] 2.2 Delete `src/modules/auth/auth.controller.spec.ts`

## 3. Users — `GET /users` and `GET /users/:id`

- [x] 3.1 Create `src/test/users/GET.spec.ts` with the following scenarios:
  - `GET /users`: each role returns 200 with an array; consultor/gerente do not see CPF; diretor/assessor/presidente see CPF; unauthenticated returns 401
  - `GET /users/:id`: any authenticated user returns 200 for an existing user; gerente does not see CPF of another user but sees own CPF (selfBypass); diretor/assessor see CPF; non-existent ID returns 404; unauthenticated returns 401

## 4. Users — `POST /users`

- [x] 4.1 Create `src/test/users/POST.spec.ts`:
  - New auth-only user (no users row) with valid body returns 201, id=sub, role=consultor
  - Missing required field returns 400; invalid sector returns 400
  - Unauthenticated (no token) returns 401; token sub not a valid UUID returns 401
  - Token sub already has a profile (jwtStatus=ok) returns 409
  - Duplicate CPF returns 409
- [x] 4.2 Delete `src/modules/users/users.controller.spec.ts`

## 5. Users — `PATCH /users/:id` and `DELETE /users/:id`

- [x] 5.1 Create `src/test/users/PATCH.spec.ts`:
  - Presidente editing any user returns 200 with updated fields; non-updated fields are preserved; `updated_at` advances
  - User editing own non-restricted fields (name) returns 200
  - User sending restricted fields (role, sector) returns 403
  - Gerente editing another user returns 403; assessor editing presidente returns 403
  - Non-existent user returns 404; unauthenticated returns 401
  - Empty body `{}` returns 400; invalid email/role/sector/CPF format return 400
  - Duplicate email returns 409; duplicate CPF returns 409
- [x] 5.2 Create `src/test/users/DELETE.spec.ts`:
  - Presidente deleting another user returns 204 with empty body
  - Consultor/gerente/diretor/assessor attempting delete returns 403
  - Self-delete (any role including presidente) returns 403
  - Assessor attempting to delete presidente returns 403
  - Non-existent user returns 404; unauthenticated returns 401
  - Deleted user no longer appears in `GET /users` (follow-up GET returns 404)

## 6. Activities — `GET /activities` and `GET /activities/me`

- [x] 6.1 Create `src/test/activities/GET.spec.ts`:
  - `GET /activities`: consultor sees only own activities; gerente sees own sector; assessor/presidente see all; filter by `?date=`, `?from=`/`?to=`, `?id=` works correctly; empty result for out-of-range date; unauthenticated returns 401
  - `GET /activities/me`: any role returns only own activities; supports `?date=` filter; unauthenticated returns 401

## 7. Activities — `POST /activities`

- [x] 7.1 Create `src/test/activities/POST.spec.ts`:
  - Any authenticated role creating a valid activity returns 201 with `user_id` matching token sub
  - Missing required fields returns 400; `time_end` before `time_start` returns 400
  - Unauthenticated returns 401
- [x] 7.2 Delete `src/modules/activities/activities.controller.spec.ts`

## 8. Activities — `PATCH /activities/:id` and `DELETE /activities/:id`

- [x] 8.1 Create `src/test/activities/PATCH.spec.ts`:
  - Owner updating own activity returns 200 with updated fields
  - Non-owner attempting update returns 403
  - Empty body `{}` returns 400; non-existent activity returns 404; unauthenticated returns 401
- [x] 8.2 Create `src/test/activities/DELETE.spec.ts`:
  - Owner deleting own activity returns 204; activity no longer accessible (follow-up returns 404)
  - Non-owner attempting delete returns 403; non-existent returns 404; unauthenticated returns 401

## 9. Notifications — `GET /notifications`

- [x] 9.1 Create `src/test/notifications/GET.spec.ts`:
  - Any authenticated role sees only their own notifications
  - Unauthenticated returns 401
  - Read/unread filter works correctly if supported

## 10. Notifications — `POST /notifications` and `PATCH /notifications/:id`

- [x] 10.1 Create `src/test/notifications/POST.spec.ts`:
  - Roles permitted to create directed notifications (assessor/presidente) return 201
  - Roles not permitted return 403
  - Invalid body returns 400; unauthenticated returns 401
- [x] 10.2 Create `src/test/notifications/DELETE.spec.ts` (corrected: route is DELETE /notifications/:id, not PATCH):
  - Owner marking a notification as read returns 200
  - Non-owner attempting to mark read returns 403
  - Non-existent notification returns 404; unauthenticated returns 401
- [x] 10.3 Delete `src/modules/notifications/notifications.controller.spec.ts`

## 11. Time-Tracking — `POST /time-entries` and `GET /time-entries`

- [x] 11.1 Create `src/test/time-entries/POST.spec.ts`:
  - Any authenticated role can clock in (no active entry) → 201
  - Clocking in when an open entry already exists → 409 or 400
  - Unauthenticated returns 401
- [x] 11.2 Create `src/test/time-entries/GET.spec.ts`:
  - Any authenticated role retrieving own entries returns 200 with correct shape
  - Assessor/presidente retrieving all entries (if supported) works; others get 403
  - Unauthenticated returns 401
- [x] 11.3 Delete `src/modules/time-tracking/time-tracking.controller.spec.ts`

## 12. Routine — `GET /routine` and `PUT /routine`

- [x] 12.1 Create `src/test/routine/GET.spec.ts`:
  - Any authenticated role retrieving own routine returns 200 with slot shape
  - Assessor/presidente retrieving another user's routine (if permitted) returns correct data
  - Non-permitted role requesting another user's routine returns 403
  - Unauthenticated returns 401
- [x] 12.2 Create `src/test/routine/PUT.spec.ts`:
  - Any authenticated role updating own routine returns 200
  - Invalid slot data returns 400; unauthenticated returns 401
- [x] 12.3 Delete `src/modules/routine/routine.controller.spec.ts`

## 13. Settings — `GET /settings` and `PATCH /settings`

- [x] 13.1 Create `src/test/settings/GET.spec.ts`:
  - Any authenticated role retrieving own settings returns 200
  - Unauthenticated returns 401
- [x] 13.2 Create `src/test/settings/PATCH.spec.ts`:
  - Any authenticated role updating own settings with valid body returns 200
  - Invalid body returns 400; unauthenticated returns 401
- [x] 13.3 Delete `src/modules/settings/settings.controller.spec.ts`

## 14. Final Verification

- [x] 14.1 Confirm no `*.spec.ts` files remain under `src/modules/` or `src/common/`
- [x] 14.2 Run `npm test` and verify all integration tests pass with zero failures
- [x] 14.3 Run `rtk lint` and confirm no ESLint errors in modified or created files
- [x] 14.4 Verify test count is equal to or greater than the count before migration (count passing tests before starting task 1, compare after task 13)
