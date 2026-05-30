## Why

A API não possui endpoint para gestão de atividades pessoais dos usuários, dificultando o acompanhamento de tarefas individuais. Além disso, a documentação das rotas está acoplada ao Swagger (runtime), tornando-a difícil de versionar e consumir fora do ambiente de desenvolvimento.

## What Changes

- Novo módulo `activities` com CRUD completo (criar, listar, editar, deletar)
- Visibilidade de atividades baseada em hierarquia de roles + setor (mesma lógica do `role-hierarchy` existente)
- Filtros de data por dia exato (`?date=`) e por intervalo (`?from=` + `?to=`)
- Somente o dono pode criar, editar e deletar suas próprias atividades
- Criação do arquivo `API.md` na raiz com documentação completa de todas as rotas
- **BREAKING** Remoção do Swagger (`@nestjs/swagger`) e todos os seus decorators dos controllers
- Endpoint `GET /docs` que renderiza o `API.md` como HTML (usando `marked`)
- Migration SQL: enum `activity_priority` + tabela `activities`

## Capabilities

### New Capabilities

- `activities-crud`: CRUD de atividades com campos name, description, date, time_start, time_end, priority (alta/media/baixa), pertencentes a um usuário
- `activities-visibility`: Regra de visibilidade por role + setor: cada usuário vê as próprias atividades e as de usuários com rank menor no mesmo setor; assessor/presidente veem tudo
- `api-docs-markdown`: Documentação das rotas em `API.md` renderizado em `GET /docs` via `marked`; remoção completa do Swagger

### Modified Capabilities

## Impact

- `src/main.ts`: remove configuração do Swagger
- `src/modules/*/` (todos os controllers): remoção de todos os decorators `@Api*` e imports de `@nestjs/swagger`
- `src/modules/*/dto/` (todos os DTOs): remoção das classes `*Schema` com `@ApiProperty`
- `src/modules/activities/` (novo): module, controller, service, dto
- `src/modules/docs/` (novo): module, controller que serve `API.md` renderizado
- `API.md` (novo na raiz): documentação completa de todas as rotas
- `package.json`: remoção de `@nestjs/swagger` e `swagger-ui-express`; adição de `marked`
- Migration SQL: novo enum `activity_priority`, nova tabela `activities`
