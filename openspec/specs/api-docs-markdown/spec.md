## ADDED Requirements

### Requirement: API.md documentation file
A file named `API.md` SHALL exist at the project root documenting all API routes. For each route it SHALL include: HTTP method, path, authentication requirement, role/access restrictions, request body schema (when applicable), query parameters (when applicable), and all possible response codes with their payload shapes.

#### Scenario: API.md covers all routes
- **WHEN** a developer reads `API.md`
- **THEN** they SHALL find documentation for every route in the application including the new activities endpoints

#### Scenario: API.md documents query parameters
- **WHEN** a route accepts query parameters (e.g., `GET /activities`, `GET /time-entries`)
- **THEN** `API.md` SHALL list each parameter, its type, whether it is optional, and its effect

### Requirement: Swagger removed
All Swagger-related code SHALL be removed: `DocumentBuilder`, `SwaggerModule` from `main.ts`; all `@Api*` decorators from controllers; all `*Schema` classes with `@ApiProperty` from DTO files; and the `@nestjs/swagger` package from dependencies.

#### Scenario: /docs no longer serves Swagger UI
- **WHEN** the application starts without Swagger configuration
- **THEN** `GET /docs` SHALL NOT return the Swagger UI HTML

#### Scenario: Controllers have no Swagger decorators
- **WHEN** any controller file is read
- **THEN** no `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`, or related decorators SHALL be present

### Requirement: Markdown documentation endpoint
`GET /docs` SHALL render the `API.md` file as HTML. The response SHALL have `Content-Type: text/html`. The HTML SHALL be readable in a browser with basic styling (headings, code blocks, tables formatted).

#### Scenario: Docs endpoint returns rendered HTML
- **WHEN** `GET /docs` is called
- **THEN** the response status is 200, `Content-Type` is `text/html`, and the body contains HTML-rendered content from `API.md`

#### Scenario: Docs endpoint requires no authentication
- **WHEN** `GET /docs` is called without a JWT token
- **THEN** the system SHALL return 200 with the rendered documentation

#### Scenario: Docs endpoint reflects current API.md content
- **WHEN** `API.md` is updated and the server restarts
- **THEN** `GET /docs` SHALL serve the updated content
