## Context

O projeto é uma API NestJS com PostgreSQL via Supabase. O módulo `users` já tem `GET /users`, `GET /users/:id` e `POST /users`. A validação de entrada segue o padrão Zod já estabelecido pelo `createUserSchema`.

## Goals / Non-Goals

**Goals:**

- `PATCH /users/:id` atualiza parcialmente os campos `email`, `name`, `role`, `sector`, `cpf`; retorna o usuário atualizado com HTTP 200
- `DELETE /users/:id` marca `inactive = true` sem remover o registro; retorna HTTP 204 sem body

**Non-Goals:**

- Reativar usuários (sem endpoint `PATCH inactive = false`)
- Filtrar usuários inativos nos `GET /users` existentes (comportamento não alterado nesta change)
- Atualizar `updated_at` manualmente — será atualizado via trigger ou pela query explicitamente

## Decisions

### 1. PATCH usa schema Zod com todos os campos opcionais (`.partial()`)

`createUserSchema.partial()` gera um `updateUserSchema` onde todos os campos são opcionais. O handler rejeita um body completamente vazio (nenhum campo fornecido) com 400, pois um PATCH sem campos é uma operação sem sentido.

**Alternativa considerada**: aceitar body vazio como no-op (200 sem alteração). Rejeitada por ser ambígua para o cliente.

### 2. UPDATE usa SET dinâmico — apenas os campos fornecidos são alterados

Monta a query `UPDATE users SET <campo> = $n, updated_at = now() WHERE id = $1 RETURNING ...` somente com as colunas presentes no body parseado. Isso evita sobrescrever campos com `undefined`.

**Alternativa considerada**: sempre enviar todos os campos. Rejeitada pois força o cliente a conhecer o estado completo antes de qualquer PATCH.

### 3. DELETE retorna 204 No Content

Soft delete não retorna o recurso modificado — apenas confirma que a operação ocorreu. HTTP 204 é o código semântico correto.

## Risks / Trade-offs

- [Unicidade após desativação] Um usuário inativo ainda ocupa o `email` e `cpf` únicos. Se o negócio precisar reutilizar esses campos no futuro, isso exigirá uma nova decisão de schema. → Mitigation: fora do escopo desta change; documentar como open question.
- [PATCH body vazio] Rejeitar body vazio com 400 pode surpreender clientes que enviam campos opcionais todos ausentes. → Mitigation: a validação Zod retornará mensagem descritiva.
- [updated_at no DELETE] O soft delete atualiza `inactive` mas também deve atualizar `updated_at` para refletir a alteração. → Mitigation: incluir `updated_at = now()` explicitamente na query UPDATE do `deactivate`.

## Open Questions

- Usuários inativos devem ser ocultados das listagens `GET /users` e `GET /users/:id`? (Não alterado nesta change — tratar em change futura se necessário.)

