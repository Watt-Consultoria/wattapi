## Why

The API currently supports reading users (`GET /users`, `GET /users/:id`) but has no way to create them. Adding `POST /users` completes the basic user lifecycle and enables client applications to register new users through the API.

## What Changes

- Add `POST /users` endpoint that accepts user data and persists a new user record to the database
- Return the created user object (excluding sensitive fields like password) with HTTP 201
- Validate required fields and return descriptive errors on invalid input

## Capabilities

### New Capabilities

- `create-user`: Handles creation of a new user via `POST /users`, including input validation and persistence

### Modified Capabilities

<!-- No existing specs require behavioral changes -->

## Impact

- `src/modules/users.service` business logic for user creation
- Database — INSERT into `users` table using the existing schema
- OpenAPI spec — new operation added to `/users` path

