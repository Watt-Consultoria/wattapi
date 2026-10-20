## Context

A Watt quer uma seção de "heróis" — ex-membros de destaque — com foto, frase, contribuições e período de atuação. Todo hero **precisa** apontar para um usuário já marcado como `inactive = true` (a rota `GET /users/inactive` já existe para localizar candidatos). Não existe hoje tabela, módulo ou rota para isso.

O módulo mais próximo em forma é `reimbursements`: upload de arquivo feito pelo frontend direto no Supabase Storage, backend recebe apenas o `path`, valida a existência do arquivo com `storage.list()` antes de persistir, e devolve uma signed URL (1h) na resposta em vez do path cru.

## Goals / Non-Goals

**Goals:**
- CRUD mínimo (create, list, get one, update) para heroes, com autorização por rank.
- `name` e `role` do hero sempre refletem o cadastro atual do usuário inativo (sem duplicar/dessincronizar dado).
- Foto do hero segue o mesmo fluxo de upload/validação/signed URL de `reimbursements`.
- `contributions` chega e retorna em formato consumível pelo frontend como lista.

**Non-Goals:**
- Não há rota de exclusão (`DELETE /heroes/:id`) neste change — não foi solicitada.
- Não há reativação automática do hero se o usuário voltar a ficar `inactive = false`; isso fica para um change futuro caso vire requisito.
- Não há upload multipart no backend — o upload em si é direto do frontend para o Storage (mesmo padrão de `reimbursements`), o backend só valida o `path`.

## Decisions

### 1. `heroes` é uma tabela própria com FK para `users`, sem duplicar `name`/`role`
`name` e `role` (cargo) são sempre lidos via `JOIN` com `users` no momento da leitura. Alternativa considerada: copiar `name`/`role` para `heroes` no momento da criação (snapshot). Rejeitada porque o pedido explícito foi "cargo = cargo do user inactive e nome = nome do user inactive" — isso é uma referência viva, não um snapshot, e evita a tabela ficar desatualizada se o cadastro do usuário for corrigido depois (ex.: correção de nome com acento).

### 2. `user_id` é `UNIQUE` e deve referenciar um usuário `inactive = true`
Um usuário tem no máximo um hero. A constraint `UNIQUE` fica no banco; a checagem de `inactive = true` fica na camada de serviço (não dá para expressar "outra tabela tem essa linha com `inactive = true`" em uma `CHECK` constraint do Postgres). Na criação: se o `user_id` não existe → `404`; se existe mas está ativo (`inactive = false`) → `400`; se já tem hero → `409`.

### 3. `contributions` trafega como array no contrato da API, mas é persistido como `TEXT` separado por vírgula
O pedido foi: "uma lista separada por vírgulas das suas principais contribuições, para o front renderizar como lista". Decisão: o contrato HTTP (request e response) usa `contributions: string[]` — isso já é "uma lista" pronta para o front iterar, sem o front precisar fazer `split(',')` no cliente. Internamente, o backend persiste como `TEXT` (`contribution_1, contribution_2, ...`, join com `", "`) e re-parseia (`split(',').map(trim)`) na leitura.
Alternativa considerada: coluna `TEXT[]` (array nativo do Postgres). Rejeitada por simplicidade — evita lidar com o driver `pg` serializando arrays, e o pedido já descreve o formato de armazenamento como "separado por vírgula". Trade-off aceito: uma contribuição não pode conter vírgula literal.

### 4. Foto: mesmo esquema de `reimbursements` (path na tabela, bucket privado, signed URL na resposta)
Coluna `photo_path TEXT NOT NULL` em `heroes` (não uma tabela de anexos separada — cada hero tem exatamente uma foto, diferente de reimbursements que tem N anexos). Novo bucket privado `hero-photos`. Fluxo:
1. Frontend faz upload direto pro bucket `hero-photos` (via Supabase client, mesmo padrão dos outros buckets do projeto).
2. `POST /heroes` e `PATCH /heroes/:id` recebem `photo_path` no body.
3. Serviço confere com `storage.from('hero-photos').list(dir, { search: filename })` que o arquivo existe antes de gravar — mesma lógica de `ReimbursementsService.create`.
4. Toda resposta troca `photo_path` por `photo_url` (signed URL, válida por 1h), nunca expõe o path cru.

A policy de upload do bucket segue o padrão de `project-stage-files` (qualquer autenticado pode fazer upload; a autorização real de quem pode criar/editar um hero é reforçada pelo `RoutePolicyGuard` no backend, não pelo RLS do Storage) — o RLS por usuário (`auth.uid()`) não se aplica aqui porque quem faz upload da foto (assessor/presidente) não é o dono do arquivo (o hero, que é outro usuário, inativo).

### 5. Autorização por rota
- `POST /heroes` e `PATCH /heroes/:id`: `RoutePolicy({ access: { mode: 'authenticated', rba: [['role', ['assessor', 'presidente']]] } })` — mesmo padrão de `DELETE /users/:user_id`.
- `GET /heroes` e `GET /heroes/:id`: `RoutePolicy({ access: { mode: 'authenticated' } })` — qualquer usuário autenticado, sem restrição de rank (pedido explícito: "qualquer rank faz o get").

### 6. Ordenação de rotas no controller
`GET /heroes/:id` deve ser declarado **depois** de qualquer rota literal sob `/heroes` (não há nenhuma neste change, mas segue o padrão já usado em `UsersController` para `GET /users/inactive` vs `GET /users/:user_id`) para evitar colisão de rota caso uma rota literal seja adicionada no futuro.

## Risks / Trade-offs

- [Contribuição com vírgula literal quebra o parsing] → Mitigação: validação no DTO rejeita `contributions` vazio; a perda de fidelidade (vírgula dentro de um item) é um trade-off aceito e documentado na decisão 3; pode virar `TEXT[]` depois se necessário.
- [Usuário reativado (`inactive = false`) continua tendo um hero "pendurado"] → Fora de escopo (Non-Goal); a listagem de heroes independe do estado atual `inactive` do usuário — uma vez hero, os dados continuam visíveis via `GET /heroes` mesmo que o usuário seja reativado depois.
- [Foto obrigatória no create trava o fluxo se o frontend não tiver terminado o upload] → Mitigação: mesma UX de `reimbursements` já validada em produção (upload primeiro, depois o POST com o path).

## Migration Plan

1. Nova migration Supabase: `CREATE TABLE heroes (...)`, índices, `INSERT INTO storage.buckets` para `hero-photos`, `CREATE POLICY` de upload.
2. Novo módulo `src/modules/heroes/` registrado no `AppModule`.
3. Sem dado legado para migrar — tabela nova, nenhum hero pré-existente.
4. Rollback: `DROP TABLE heroes`, remover o bucket e a policy, remover o módulo do `AppModule`.

## Open Questions

Nenhuma pendente — assumida ordenação `created_at DESC` em `GET /heroes` (heroes mais recentes primeiro) por não ter sido especificada; pode ser revisitada se o frontend precisar de outra ordem (ex.: `start_year`).
