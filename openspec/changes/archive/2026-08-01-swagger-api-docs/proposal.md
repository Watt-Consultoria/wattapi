## Why

`API.md` é escrito e mantido manualmente, sem nenhuma conexão com o código — já ficou desatualizado antes e vai ficar de novo. As regras de autorização (`@RoutePolicy`) já existem como metadata estruturada aplicada em runtime, mas hoje são apenas transcritas à mão em prosa no markdown. Precisamos de documentação gerada a partir do código (schemas zod já existentes + metadata de `RoutePolicy`) com uma superfície interativa ("try it out") para testar rotas sem depender de Postman/Insomnia — sem repetir o problema que motivou a remoção anterior do Swagger neste projeto (doc que só existe em runtime, não revisável em diff de PR).

## What Changes

- `GET /docs` deixa de renderizar `API.md` via `marked` e passa a servir Swagger UI (`SwaggerModule.setup`).
- **BREAKING**: remoção do `DocsController`/`DocsModule` atual (leitura de `API.md` + `marked`) e do arquivo `API.md` da raiz do projeto — a fonte de documentação deixa de ser markdown escrito à mão.
- Adoção de `nestjs-zod` (`createZodDto`) para transformar os schemas zod de request já existentes (nos 16 diretórios `dto/`) em DTOs reais, usadas nos controllers (`@Body() body: CreateUserDto`) no lugar de `@Body() body: unknown`.
- Substituição da validação manual (`schema.safeParse(body)` + `throw new BadRequestException(result.error.flatten())` espalhada pelos controllers) por um `ZodValidationPipe` global, configurado para preservar o formato de erro 400 atual (`{formErrors, fieldErrors}`) — é uma mudança de onde a validação roda, não do contrato de API.
- Criação de schemas zod de resposta (hoje `interface` TS soltas, ex: `UserResponse` em `users.service.ts`) para os módulos que expõem rotas, usadas como DTOs de resposta no documento OpenAPI. Campos afetados por `RoutePolicy.output` (ex: `cpf`) são marcados opcionais/nullable no schema, com nota em `description` explicando que a presença depende do rank de quem chama.
- Transform executado no bootstrap, antes de `SwaggerModule.createDocument`, que lê o metadata de `@RoutePolicy` (já consumido em runtime por `RoutePolicyGuard`/`RoleSerializerInterceptor` via `Reflector`) e injeta automaticamente a regra de autorização de cada rota (`mode`, `rba`, campos com output policy) na `description` da operation — elimina a necessidade de escrever essas regras à mão na documentação.
- `.addBearerAuth()` no `DocumentBuilder` e segurança Bearer aplicada às rotas autenticadas.
- Script que gera o documento OpenAPI fora do `listen()` (sem subir o servidor HTTP) e escreve `openapi.json` versionado na raiz do repo — resolve o motivo original pelo qual o Swagger foi removido (doc só existir em runtime, impossível de revisar em PR).
- Checagem executável em CI que falha se o `openapi.json` commitado estiver desatualizado em relação ao spec gerado a partir do código atual (evita o mesmo tipo de drift que afetava o `API.md`).

## Capabilities

### New Capabilities

(nenhuma — a mudança substitui o mecanismo de uma capability existente)

### Modified Capabilities

- `api-docs-markdown`: os requirements atuais ("API.md documentation file", "Swagger removed", "Markdown documentation endpoint") deixam de valer e são substituídos por requirements de Swagger UI em `/docs`, geração de descrição de autorização a partir do metadata de `RoutePolicy`, e export estático versionado de `openapi.json`.

## Impact

- `src/main.ts`: adiciona `DocumentBuilder`/`SwaggerModule`, `ZodValidationPipe` global, chamada ao transform de descrição de autorização.
- `src/modules/docs/`: `DocsController`/`DocsModule` atuais são removidos ou reescritos em torno do Swagger; dependência de `marked` removida de `package.json`.
- `API.md`: removido da raiz do projeto.
- `package.json`: adiciona `nestjs-zod`, `@nestjs/swagger`, `swagger-ui-express`; remove `marked`.
- Todos os 19 controllers (`activities`, `auth`, `email`, `gamification`, `houses`, `internal`, `leads`, `norms`, `notifications`, `portfolio`, `push-subscriptions`, `reimbursements`, `routine`, `selection-process`, `settings`, `status`, `time-tracking`, `users`, `violations`) e as 16 pastas `dto/`: troca de `@Body() body: unknown` + `safeParse` manual por DTOs tipadas via `createZodDto`; novos schemas zod de resposta.
- `src/common/decorators/route-policy.decorator.ts`, `src/common/guards/route-policy.guard.ts`, `src/common/interceptors/role-serializer.interceptor.ts`: nenhuma mudança de comportamento — apenas passam a ser lidos também por um transform de documentação.
- Novo script de geração de `openapi.json` + o próprio arquivo `openapi.json` versionado no repo.
- `openspec/config.yaml`: a regra existente ("ao criar novo endpoint, adicionar task de atualizar a documentação da API") passa a significar "garantir DTOs/schemas corretos + regenerar `openapi.json`" em vez de "editar `API.md`" — atualização dessa regra fica fora do escopo deste change.
