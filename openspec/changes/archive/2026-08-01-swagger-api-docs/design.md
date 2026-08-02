## Context

Stack: NestJS 11, validação via zod (não `class-validator`), acesso a dados via SQL cru (`pg`, sem ORM), RBAC customizado por `@RoutePolicy` + `RoutePolicyGuard` + `RoleSerializerInterceptor`. A documentação atual (`API.md`, ~69KB, ~55 rotas) é escrita e mantida manualmente e renderizada em `GET /docs` via `marked`.

O Swagger já existiu neste projeto e foi removido deliberadamente em `openspec/changes/archive/2026-05-30-activities-and-docs`. O motivo registrado naquele design: a documentação gerada pelo Swagger só existia em runtime, difícil de versionar e revisar fora do ambiente rodando. Este change reintroduz o Swagger, mas desta vez a partir de fontes já estruturadas no código (zod schemas de request, metadata de `RoutePolicy`) e com um artefato estático versionado (`openapi.json`) — endereçando diretamente o motivo da remoção anterior.

Escala: 19 controllers, 16 pastas `dto/`, 73 definições de schema zod (`z.object`/`z.infer`).

## Goals / Non-Goals

**Goals:**

- Gerar documentação de request/response a partir dos zod schemas já existentes, sem duplicar informação à mão.
- Gerar a descrição de autorização de cada rota a partir do metadata `@RoutePolicy` já existente (mesma fonte que o guard usa em runtime), não escrita em prosa separada.
- Fornecer Swagger UI interativo ("try it out") em `GET /docs`.
- Produzir um artefato `openapi.json` versionado e revisável em diff de PR — resolve o motivo da remoção anterior.
- Preservar o contrato de API atual (mesmos status codes, mesmo formato de erro 400) — este change é de documentação/tipagem, não de comportamento.

**Non-Goals:**

- Gerar cliente TypeScript para o frontend (wattdash) a partir do `openapi.json` — pode ser um change futuro que consome o artefato produzido aqui.
- Mudar as regras de RBAC em si — `RoutePolicy`, `RoutePolicyGuard` e `RoleSerializerInterceptor` mantêm exatamente o mesmo comportamento; só passam a ser lidos também por um transform de documentação.
- Expressar formalmente em schema OpenAPI a lógica de output condicional (ex: `cpf` omitido por rank) — documentado via `description`, aceitando a limitação do formato.
- Migrar validação de query params — escopo deste change é `@Body()`.

## Decisions

### 1. `nestjs-zod` em vez de `@asteasolutions/zod-to-openapi` isolado

Alternativa considerada: gerar o spec num arquivo separado com `zod-to-openapi`, sem tocar os controllers, mapeando rota→schema manualmente.

Decisão: `nestjs-zod`. Motivos: (a) elimina a necessidade de manter um segundo mapeamento rota→schema fora dos controllers — usa o `@Body()` real; (b) substitui a validação manual (`schema.safeParse` + `throw BadRequestException` repetido em ~19 controllers) por um pipe único; (c) o refactor mais amplo foi aceito explicitamente em troca de eliminar essa segunda fonte de verdade.

### 2. Exception factory customizada no `ZodValidationPipe` para preservar o formato de erro atual

Hoje o erro 400 usa `result.error.flatten()` do zod puro (`{formErrors: string[], fieldErrors: Record<string, string[]>}`). O formato default de erro do `nestjs-zod` é diferente.

Decisão: configurar o `exceptionFactory` do pipe para chamar `.flatten()` e lançar `BadRequestException` exatamente como hoje. Isso preserva o contrato de erro 400 sem quebrar testes de integração existentes e sem exigir "Modified Capability" nas specs que hoje descrevem respostas 400 — o único capability que muda neste change é `api-docs-markdown`.

Alternativa considerada: aceitar o formato default do `nestjs-zod` — rejeitada por quebrar contrato de API para consumidores existentes (wattdash) sem necessidade real.

### 3. Schemas zod de resposta são código novo, não gerados automaticamente a partir das `interface` TS

As respostas hoje são `interface` (ex: `UserResponse` em `users.service.ts`) — apagadas na compilação, não introspectáveis em runtime. Não é possível derivar zod delas automaticamente.

Decisão: escrever schemas zod novos ao lado (ou no lugar) das interfaces atuais, espelhando os mesmos campos que os mapeadores `toResponse()`/`SELECT_FIELDS` já tratam como fonte da verdade. Campos afetados por `RoutePolicy.output` (ex: `cpf`) viram `.optional()` no schema de resposta, com `description` explicando a regra real (“presente apenas se quem consulta tem rank ≥ 2 ou é o próprio usuário”).

### 4. Transform de descrição de autorização lê `RoutePolicy` via `Reflector`/`DiscoveryService`, roda uma vez no bootstrap

Para cada rota descoberta via `DiscoveryService`, lê o metadata `ROUTE_POLICY_KEY` (a mesma chave que `RoutePolicyGuard` já lê em runtime) e pós-processa o `OpenAPIObject` retornado por `SwaggerModule.createDocument`, injetando a descrição textual gerada na propriedade `description` da operation correspondente (casada por `path` + `method`).

Alternativa considerada: decorar cada rota manualmente com `@ApiOperation({ description: '...' })` — rejeitada por ser exatamente o tipo de duplicação manual que fez o `API.md` ficar desatualizado.

### 5. Export estático de `openapi.json` via script dedicado, fora do `listen()`

Um script (`src/common/scripts/generate-openapi.ts`, executado via `npm run docs:generate`) instancia a aplicação Nest com `NestFactory.create`, monta o mesmo `DocumentBuilder` e roda o mesmo transform de RBAC usados no `main.ts`, serializa o `OpenAPIObject` e escreve `openapi.json` na raiz — sem chamar `app.listen()`. `SwaggerModule.setup('docs', app, document)` continua rodando normalmente no `main.ts` para servir a UI interativa. A construção do documento fica numa função compartilhada, usada tanto pelo `main.ts` quanto pelo script, para não haver duas fontes de verdade do spec.

### 6. Checagem de staleness do `openapi.json` via script de CI, não hook de commit

Um script `npm run docs:check` roda a mesma geração num diretório temporário e compara (deep-equal) contra o `openapi.json` commitado; falha com exit code não-zero se divergente. Roda no pipeline de CI existente (`.github/`) num novo job e também como pre-push hook — evita forçar geração a cada save local.

## Risks / Trade-offs

- **Volume do refactor (19 controllers, 16 pastas `dto/`)** → risco de regressão de validação em alguma rota durante a migração. Mitigação: migração módulo por módulo, rodando a suíte de testes de integração existente (`src/test/`) a cada módulo antes de seguir para o próximo.
- **Compatibilidade do `nestjs-zod` com NestJS 11 / zod `^4.4.3` não confirmada** → Mitigação: task explícita de verificação de compatibilidade (spike isolado) antes de iniciar a migração dos controllers; se incompatível, fallback é um `ZodValidationPipe` caseiro (poucas linhas) sem a dependência externa, mantendo o mesmo padrão de DTO.
- **Schemas de resposta com campos opcionais por causa de `RoutePolicy.output` tornam o spec "menos preciso"** (documenta o shape máximo, não o real por caller) → aceito como limitação conhecida do formato OpenAPI, mitigado por `description` por campo.
- **`openapi.json` fica desatualizado mesmo com o script existindo** (alguém esquece de rodar `docs:generate` antes de commitar) → Mitigação: check de staleness em CI (Decisão 6) bloqueia merge se o arquivo commitado não bater com o gerado a partir do código atual.
- **Remoção do `API.md`/`marked` é BREAKING para quem dependa do HTML atual em `/docs`** → Mitigação: sem consumidores externos conhecidos além do time interno; comunicar a mudança de formato de resposta de `/docs` (de HTML estático para Swagger UI) antes do deploy.

## Migration Plan

1. Instalar `nestjs-zod`, `@nestjs/swagger`, `swagger-ui-express`; validar compatibilidade com NestJS 11 num spike isolado antes de tocar qualquer controller.
2. Migrar módulo por módulo (DTOs de request primeiro, depois schemas de response), rodando a suíte de testes existente a cada módulo migrado.
3. Implementar o `ZodValidationPipe` global com a exception factory compatível (Decisão 2); remover os `safeParse` manuais correspondentes.
4. Implementar o transform de descrição de autorização a partir do metadata de `RoutePolicy`.
5. Configurar `DocumentBuilder`/`SwaggerModule` no `main.ts`, substituindo o `DocsModule` atual.
6. Implementar `generate-openapi.ts` e gerar o primeiro `openapi.json` commitado.
7. Implementar e cablear o check de staleness (`docs:check`) no CI existente.
8. Remover `API.md`, `DocsController`/`DocsModule` antigos e a dependência `marked`.
9. Rollback: reversão do deploy — não há mudança de schema de banco envolvida, rollback é só reversão de código.

## Open Questions

- `nestjs-zod` está ativamente mantido e compatível com NestJS 11 / zod 4? Precisa verificação antes de começar (ver Risco 2 / Migration step 1).
- O `openapi.json` deve declarar servers (`.addServer()` para dev/staging/prod) ou ficar sem servidor fixo?
