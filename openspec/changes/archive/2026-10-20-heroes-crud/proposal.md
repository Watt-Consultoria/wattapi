## Why

A Watt quer homenagear ex-membros de destaque ("heróis") em uma página pública/institucional, com foto, frase, contribuições e período na empresa. Hoje não existe nenhuma rota nem tabela para isso — os dados de um herói precisam ser derivados de um usuário já desativado (`inactive = true`) mais um conjunto de campos editoriais que só existem para esse fim.

## What Changes

- Nova tabela `heroes`, com `user_id` apontando para um `users.id` marcado como `inactive = true` (1 hero por usuário).
- Nova rota `POST /heroes` — cria um hero a partir de um usuário inativo. Restrita a rank ≥ 3 (`assessor`, `presidente`).
- Nova rota `GET /heroes` — lista todos os heróis. Qualquer usuário autenticado pode chamar.
- Nova rota `GET /heroes/:id` — retorna um hero específico. Qualquer usuário autenticado pode chamar.
- Nova rota `PATCH /heroes/:id` — atualiza campos editoriais de um hero existente. Restrita a rank ≥ 3.
- Cada hero armazena: `phrase` (frase que representa o membro), `contributions` (lista, persistida separada por vírgula, renderizada como array na resposta), `start_year`, `end_year`, e uma foto (`photo_path`, seguindo o mesmo esquema de upload/validação/signed URL usado em `reimbursements`: o frontend faz upload direto para um bucket privado do Supabase Storage e envia o `path` no corpo da requisição; o backend valida a existência do arquivo e retorna uma signed URL na resposta).
- `name` e `role` (cargo) do hero **não são armazenados** — são sempre lidos do usuário inativo referenciado (`users.name`, `users.role`) no momento da leitura, para nunca ficarem dessincronizados do cadastro do usuário.
- Novo bucket de storage privado `hero-photos`, com policy de upload para usuários autenticados (mesmo padrão de `project-stage-files`), já que a autorização de quem pode efetivamente criar/atualizar um hero é reforçada pelo backend (`RoutePolicy`, rank ≥ 3).

## Capabilities

### New Capabilities
- `heroes-crud`: criação, listagem, leitura individual e atualização de heróis vinculados a usuários inativos, incluindo upload de foto.

### Modified Capabilities
(nenhuma — a rota `GET /users/inactive`, usada para localizar candidatos a herói, já existe e não muda de comportamento)

## Impact

- Novo módulo `src/modules/heroes/` (controller, service, module, DTOs) seguindo o padrão de `reimbursements`.
- Nova migration Supabase criando a tabela `heroes`, o bucket `hero-photos` e a policy de upload.
- `API.md` e `openapi.json` precisam ser atualizados com as 4 novas rotas.
- Novos testes de integração em `src/test/heroes/` (POST, GET, PATCH), seguindo o padrão role-based dos testes de `users`/`reimbursements`.
