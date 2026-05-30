## ADDED Requirements

### Requirement: Role and sector based visibility
`GET /activities` SHALL apply visibility rules based on the requester's role rank and sector. A user SHALL see:
1. Their own activities (always)
2. Activities of users with a strictly lower role rank AND in the same sector
3. If the requester's rank is >= 3 (assessor or presidente), all activities regardless of sector or rank

Role ranks: consultor=0, gerente=1, diretor=2, assessor=3, presidente=4.

#### Scenario: User sees own activities
- **WHEN** a user calls `GET /activities`
- **THEN** their own activities are always included in the response

#### Scenario: Gerente sees consultores from the same sector
- **WHEN** a gerente in sector "projetos" calls `GET /activities`
- **THEN** activities from consultores in sector "projetos" are included, but not from gerentes or above in any sector

#### Scenario: Diretor sees gerentes and consultores from the same sector
- **WHEN** a diretor in sector "projetos" calls `GET /activities`
- **THEN** activities from both gerentes and consultores in sector "projetos" are included

#### Scenario: Cross-sector isolation for non-superusers
- **WHEN** a diretor in sector "projetos" calls `GET /activities`
- **THEN** activities from users in sector "comercial" are NOT included (except the diretor's own if any)

#### Scenario: Consultor sees only own activities
- **WHEN** a consultor calls `GET /activities`
- **THEN** only their own activities are returned (no subordinates exist at rank < 0)

#### Scenario: Superuser sees all activities
- **WHEN** an assessor or presidente calls `GET /activities`
- **THEN** all activities from all users across all sectors are returned

### Requirement: Visibility rules do not apply to write operations
Create, edit, and delete operations SHALL NOT use visibility rules. The requester can only create activities for themselves and can only edit/delete activities they own, regardless of whether they could "see" those activities via the list endpoint.

#### Scenario: Gerente cannot edit a consultor's activity
- **WHEN** a gerente sends `PATCH /activities/:id` for an activity owned by a consultor in their sector
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Superuser cannot delete another user's activity
- **WHEN** an assessor sends `DELETE /activities/:id` for an activity they do not own
- **THEN** the system SHALL return 403 Forbidden
