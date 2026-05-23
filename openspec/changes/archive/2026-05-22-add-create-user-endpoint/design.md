## Context

The project is a NestJS REST API backed by a PostgreSQL database (via Supabase). The `users` module already has a controller and service with `GET /users` and `GET /users/:id`. The database schema enforces constraints on `role`, `sector`, `cpf`, and `email` uniqueness. Adding `POST /users` follows the same pattern already established.

## Goals / Non-Goals

**Goals:**
- Add `POST /users` that validates input, inserts a row, and returns the created user
- Reuse the existing `DatabaseService` and `UserResponse` shape
- Return HTTP 201 on success and descriptive errors on bad input or constraint violations

**Non-Goals:**
- Password hashing / authentication (no password field in current schema)
- Rate limiting or email verification
- Pagination or filtering changes to existing endpoints

## Decisions

### 1. Use Zod for input validation

Zod is already a project dependency and provides schema-based validation with precise type inference. The schema is defined once and used both for parsing/coercing the request body and as the TypeScript type source, eliminating the decorator boilerplate of `class-validator`.

**Decision**: Define a `createUserSchema` Zod object in `src/modules/users/dto/create-user.dto.ts`. Parse `req.body` with `schema.safeParse()` in the controller and throw `BadRequestException` with Zod's formatted errors on failure. Infer the DTO type via `z.infer<typeof createUserSchema>`.

### 2. Delegate DB constraint errors to a NestJS exception filter or catch in the service

The DB already enforces uniqueness on `email` and `cpf` and CHECK constraints on `role` and `sector`. The service will catch `pg` error code `23505` (unique violation) and rethrow as `ConflictException`, and `23514` (check violation) as `BadRequestException`.

**Decision**: Handle known PG error codes in the service; let unhandled errors bubble to NestJS's default 500 handler.

### 3. Return the created row from the INSERT

Use `INSERT … RETURNING id, email, name, role, sector, cpf, created_at, updated_at` to avoid a second SELECT.

## Risks / Trade-offs

- [CPF format] The DB accepts both `11111111111` and `111.111.111-11` — the Zod schema should validate this with `.regex()` matching the DB CHECK constraint. → Mitigation: use the same regex from the migration.
- [Schema drift] If the DB schema changes, the Zod schema must be updated manually. → Mitigation: keep the Zod schema and migration co-located and review together.
