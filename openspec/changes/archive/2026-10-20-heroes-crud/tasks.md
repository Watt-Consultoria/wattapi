## 1. Database

- [x] 1.1 Create migration `supabase/migrations/<timestamp>_create-heroes-table.sql`:
  - `heroes` table: `id UUID PK default gen_random_uuid()`, `user_id UUID NOT NULL UNIQUE REFERENCES users(id)`, `phrase TEXT NOT NULL`, `contributions TEXT NOT NULL`, `start_year INTEGER NOT NULL`, `end_year INTEGER NOT NULL`, `photo_path TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `CHECK (start_year <= end_year)`
  - Index on `user_id` (already covered by UNIQUE, but confirm), index on `created_at DESC`
  - `INSERT INTO storage.buckets (id, name, public) VALUES ('hero-photos', 'hero-photos', false) ON CONFLICT (id) DO NOTHING;`
  - `CREATE POLICY` allowing authenticated users to upload to `hero-photos` (same pattern as `project-stage-files`)
- [x] 1.2 Run `npm run services:db:reset` locally and confirm the migration applies cleanly

## 2. TDD — Write failing integration tests first

- [x] 2.1 Use the `integration-test` skill to scaffold `src/test/heroes/POST.spec.ts`, `GET.spec.ts`, `PATCH.spec.ts` following the role-based pattern used in `src/test/users/` and `src/test/reimbursements/` (or the closest existing equivalent), covering every scenario in `openspec/changes/heroes-crud/specs/heroes-crud/spec.md`
- [x] 2.2 Run `npm test` and confirm all new heroes tests **fail** (RED) because no route/module exists yet — do not write implementation code before this is confirmed

**Testing** (scenarios to cover, mirrored from the spec — see `specs/heroes-crud/spec.md` for full detail):

| Route | Case | Expected |
|---|---|---|
| `POST /heroes` | superuser, valid body, inactive user without hero, photo exists in bucket | `201` with hero incl. `name`/`role` from user, `contributions` array, `photo_url` |
| `POST /heroes` | rank < 3 | `403` |
| `POST /heroes` | no token | `401` |
| `POST /heroes` | `user_id` not found | `404` |
| `POST /heroes` | `user_id` references an active user | `400` |
| `POST /heroes` | `user_id` already has a hero | `409` |
| `POST /heroes` | missing required field | `400` |
| `POST /heroes` | empty `contributions` | `400` |
| `POST /heroes` | `start_year > end_year` | `400` |
| `POST /heroes` | `photo_path` missing from bucket | `400` |
| `GET /heroes` | any rank, authenticated | `200` array with `photo_url`, `contributions` array |
| `GET /heroes` | no token | `401` |
| `GET /heroes/:id` | any rank, existing hero | `200` |
| `GET /heroes/:id` | not found | `404` |
| `GET /heroes/:id` | no token | `401` |
| `PATCH /heroes/:id` | superuser, partial body | `200` updated fields only |
| `PATCH /heroes/:id` | rank < 3 | `403` |
| `PATCH /heroes/:id` | no token | `401` |
| `PATCH /heroes/:id` | empty body | `400` |
| `PATCH /heroes/:id` | not found | `404` |
| `PATCH /heroes/:id` | new `photo_path` missing from bucket | `400` |
| `PATCH /heroes/:id` | resulting `start_year > end_year` | `400` |

## 3. Module scaffolding

- [x] 3.1 Create `src/modules/heroes/heroes.module.ts` (register `HeroesController`, `HeroesService`, import `DatabaseService`/`DatabaseModule` as done in `reimbursements.module.ts`)
- [x] 3.2 Register `HeroesModule` in the root `AppModule`

## 4. DTOs

- [x] 4.1 `src/modules/heroes/dto/hero.dto.ts`: `CreateHeroDto` (`user_id`, `phrase`, `contributions: string[]` non-empty, `start_year`, `end_year`, `photo_path`) and `UpdateHeroDto` (all fields from create except `user_id`, all optional, at least one required — reuse the `updateUserSchema`-style partial pattern from `users`), plus `HeroRow` interface matching the table
- [x] 4.2 `src/modules/heroes/dto/hero.response.dto.ts`: `heroResponseSchema` (Zod) with `id`, `user_id`, `name`, `role`, `phrase`, `contributions: string[]`, `start_year`, `end_year`, `photo_url`, `created_at`, `updated_at`, and example `.meta()` block

## 5. Service

- [x] 5.1 `src/modules/heroes/heroes.service.ts`:
  - `create(dto)`: validate referenced user exists (`404`) and is `inactive = true` (`400`); validate no existing hero for that `user_id` (`409`); validate `start_year <= end_year` (`400`); validate `photo_path` exists in `hero-photos` bucket via `storage.list()` (same approach as `ReimbursementsService.create`, `400` if missing); join `contributions` array with `', '` for storage; insert row; return via `withSignedUrl` + user join
  - `findAll()`: `SELECT` heroes JOIN users (for `name`/`role`), order by `created_at DESC`, map through signed URL + contributions split
  - `findOne(id)`: same join, `404` if not found
  - `update(id, dto)`: partial `SET`, re-validate `start_year <= end_year` against merged values, re-validate `photo_path` in storage if provided, `404` if not found, `400` if body empty (guard in controller like `UsersController.update`)
  - Private helpers: `toResponse(row)` (splits `contributions`, builds `photo_url` via `createSignedUrl('hero-photos', path, 3600)`), consistent with `ReimbursementsService.withSignedUrls`

## 6. Controller

- [x] 6.1 `src/modules/heroes/heroes.controller.ts`:
  - `@Controller('heroes')` + `@UseGuards(RoutePolicyGuard)`
  - `POST /heroes` — `@RoutePolicy({ access: { mode: 'authenticated', rba: [['role', ['assessor', 'presidente']]] } })`, `@HttpCode(201)`, `@ApiResponse({ status: 201, type: HeroResponseDto })`
  - `GET /heroes` — `@RoutePolicy({ access: { mode: 'authenticated' } })`, `@ApiResponse({ status: 200, type: [HeroResponseDto] })`
  - `GET /heroes/:id` — `@RoutePolicy({ access: { mode: 'authenticated' } })`, `@ApiResponse({ status: 200, type: HeroResponseDto })`
  - `PATCH /heroes/:id` — `@RoutePolicy({ access: { mode: 'authenticated', rba: [['role', ['assessor', 'presidente']]] } })`, empty-body guard (`400` via `BadRequestException`), `@ApiResponse({ status: 200, type: HeroResponseDto })`

## 7. Make tests pass (GREEN)

- [x] 7.1 Run `npm test` and iterate until every heroes test from section 2 passes
- [x] 7.2 Add/adjust edge-case tests found missing during implementation, keep the suite aligned with `specs/heroes-crud/spec.md`

## 8. Documentation

- [x] 8.1 Add `Heroes` section to `API.md` documenting `POST /heroes`, `GET /heroes`, `GET /heroes/:id`, `PATCH /heroes/:id` (auth requirements, body, path params, responses) — follow the existing style used for `Users`/`Reimbursements` sections
- [x] 8.2 Run `npm run docs:generate` to refresh `openapi.json`, then `npm run docs:check` to confirm it is no longer stale

## 9. Finish

- [x] 9.1 Run `npm run lint` (oxlint + prettier check) on all new/modified files and fix any violations
- [x] 9.2 Run `npm test` and confirm the full suite passes, not just the new heroes tests
