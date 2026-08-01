## REMOVED Requirements

### Requirement: API.md documentation file
**Reason**: A documentação passa a ser gerada a partir do código (schemas zod de request/response + metadata de `RoutePolicy`) e servida via Swagger UI/OpenAPI, em vez de um arquivo markdown mantido manualmente — que ficava desatualizado por não ter nenhuma conexão com o código.
**Migration**: Remover `API.md` da raiz do projeto. Consumidores que liam o arquivo diretamente devem passar a consumir `openapi.json` (versionado no repo) ou a UI interativa em `GET /docs`.

A file named `API.md` SHALL exist at the project root documenting all API routes. For each route it SHALL include: HTTP method, path, authentication requirement, role/access restrictions, request body schema (when applicable), query parameters (when applicable), and all possible response codes with their payload shapes.

#### Scenario: API.md covers all routes
- **WHEN** a developer reads `API.md`
- **THEN** they SHALL find documentation for every route in the application including the new activities endpoints

#### Scenario: API.md documents query parameters
- **WHEN** a route accepts query parameters (e.g., `GET /activities`, `GET /time-entries`)
- **THEN** `API.md` SHALL list each parameter, its type, whether it is optional, and its effect

### Requirement: Swagger removed
**Reason**: Este change reintroduz o Swagger deliberadamente, desta vez gerado a partir de schemas zod já existentes e de metadata de `RoutePolicy` já usado em runtime, com um artefato `openapi.json` versionado que resolve o motivo original da remoção (documentação que só existia em runtime, não revisável em diff de PR).
**Migration**: Nenhuma ação de consumidor necessária além de passar a usar `GET /docs` (agora Swagger UI) e/ou `openapi.json` em vez do HTML anterior.

All Swagger-related code SHALL be removed: `DocumentBuilder`, `SwaggerModule` from `main.ts`; all `@Api*` decorators from controllers; all `*Schema` classes with `@ApiProperty` from DTO files; and the `@nestjs/swagger` package from dependencies.

#### Scenario: /docs no longer serves Swagger UI
- **WHEN** the application starts without Swagger configuration
- **THEN** `GET /docs` SHALL NOT return the Swagger UI HTML

#### Scenario: Controllers have no Swagger decorators
- **WHEN** any controller file is read
- **THEN** no `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`, or related decorators SHALL be present

### Requirement: Markdown documentation endpoint
**Reason**: `GET /docs` passa a servir Swagger UI gerado a partir do código, substituindo a renderização de markdown estático mantido manualmente.
**Migration**: Remover `DocsController`/`DocsModule` atuais (leitura de `API.md` + `marked`) e a dependência `marked` de `package.json`.

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

## ADDED Requirements

### Requirement: Swagger UI interativa em /docs
`GET /docs` SHALL servir uma interface Swagger UI interativa, gerada a partir do documento OpenAPI construído em runtime (`SwaggerModule.setup`), permitindo executar requisições ("try it out") diretamente do navegador.

#### Scenario: /docs serve Swagger UI
- **WHEN** `GET /docs` é chamado sem token de autenticação
- **THEN** o sistema SHALL retornar HTTP 200 com a interface Swagger UI renderizada

#### Scenario: Rota autenticada exige Bearer token na UI
- **WHEN** o usuário tenta executar "try it out" numa rota com `RoutePolicy.access.mode: 'authenticated'` sem informar um Bearer token no Swagger UI
- **THEN** a chamada SHALL retornar HTTP 401, exatamente como uma chamada direta à API sem token

### Requirement: Documento OpenAPI derivado dos schemas zod de request e response
O sistema SHALL gerar o schema de cada operation do documento OpenAPI a partir dos schemas zod já usados para validação de request (via `createZodDto`) e de schemas zod de response, sem exigir anotações manuais (`@ApiProperty`) que dupliquem a definição de campos.

#### Scenario: Corpo de requisição documentado a partir do schema zod
- **WHEN** o documento OpenAPI é gerado para uma rota com `@Body() body: CreateUserDto` (originada de `createUserSchema`)
- **THEN** o schema da operation SHALL refletir os campos, tipos e obrigatoriedade definidos em `createUserSchema`, sem edição manual adicional

#### Scenario: Corpo de resposta documentado a partir de schema zod
- **WHEN** o documento OpenAPI é gerado para uma rota que retorna um shape de usuário
- **THEN** o schema de resposta SHALL refletir os campos definidos no schema zod de resposta correspondente, incluindo campos afetados por `RoutePolicy.output` marcados como opcionais com uma `description` explicando a condição real de presença

### Requirement: Descrição de autorização gerada a partir do metadata de RoutePolicy
O sistema SHALL gerar automaticamente, para cada rota, um texto de descrição de autorização a partir do metadata `@RoutePolicy` (mode e rba) associado ao handler, e injetá-lo na `description` da operation correspondente no documento OpenAPI — sem exigir que esse texto seja escrito manualmente.

#### Scenario: Rota com mode authenticated e rba por role
- **WHEN** o documento OpenAPI é gerado para uma rota decorada com `@RoutePolicy({ access: { mode: 'authenticated', rba: [['role', ['assessor', 'presidente']]] } })`
- **THEN** a `description` da operation correspondente SHALL mencionar que a rota exige autenticação e é restrita aos roles `assessor` ou `presidente`

#### Scenario: Rota sem restrição de rba
- **WHEN** o documento OpenAPI é gerado para uma rota decorada apenas com `@RoutePolicy({ access: { mode: 'authenticated' } })`
- **THEN** a `description` da operation correspondente SHALL mencionar apenas que a rota exige autenticação, sem citar restrição adicional de role/setor

#### Scenario: Metadata de RoutePolicy muda e a descrição acompanha
- **WHEN** o valor de `@RoutePolicy` de uma rota é alterado no código e o documento OpenAPI é regenerado
- **THEN** a descrição de autorização gerada SHALL refletir a nova condição, sem exigir edição manual da documentação

### Requirement: Documento OpenAPI exportado como artefato estático versionado
O sistema SHALL prover um script que gera o documento OpenAPI completo sem iniciar o servidor HTTP e o escreve como `openapi.json` na raiz do repositório, permitindo que a documentação seja revisada em diffs de pull request.

#### Scenario: Geração do artefato estático
- **WHEN** o script de geração é executado (`npm run docs:generate` ou equivalente)
- **THEN** um arquivo `openapi.json` SHALL ser escrito na raiz do projeto contendo o documento OpenAPI completo, sem exigir que a aplicação esteja rodando (`app.listen()`)

#### Scenario: Verificação de desatualização do artefato
- **WHEN** o script de verificação é executado (`npm run docs:check` ou equivalente) e o `openapi.json` commitado difere do documento gerado a partir do código atual
- **THEN** o script SHALL terminar com código de saída diferente de zero, sinalizando que o artefato está desatualizado
