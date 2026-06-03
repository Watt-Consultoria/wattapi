## ADDED Requirements

### Requirement: Controle de acesso unificado para leads

Todas as rotas sob `/leads` e `/leads/:id/contacts` e `/leads/:id/comments` SHALL aplicar a mesma política de acesso: autenticado com `rba: [['minRank', 3], ['sector', 'comercial'], ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]`.

#### Scenario: Consultor do comercial acessa leads

- **WHEN** qualquer rota de leads com caller `{ role: 'consultor', sector: 'comercial' }`
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Diretor de marketing acessa leads

- **WHEN** qualquer rota de leads com caller `{ role: 'diretor', sector: 'marketing' }`
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Gerente de projetos tenta acessar leads

- **WHEN** qualquer rota de leads com caller `{ role: 'gerente', sector: 'projetos' }`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Superuser acessa leads

- **WHEN** qualquer rota de leads com caller com rank >= 3
- **THEN** o sistema SHALL permitir o acesso independente do setor

---

### Requirement: Listagem de leads

O sistema SHALL expor `GET /leads` retornando todos os leads (sem filtro por criador) com detalhes completos: campos principais incluindo `cnpj`, `contacts` e `comments` (ordenados por `created_at` ASC) de cada lead. O sistema SHALL buscar contatos e comentários em batch (uma query por tabela), não em N+1.

#### Scenario: Listagem retorna todos os leads com contatos e comentários

- **WHEN** `GET /leads` por usuário autorizado
- **THEN** o sistema SHALL retornar HTTP 200 com array de leads contendo `id`, `company_name`, `cnpj`, `status`, `created_by`, `created_at`, `updated_at`, campos de endereço, `contacts` (array) e `comments` (array)

### Requirement: Criação de lead

O sistema SHALL expor `POST /leads`. O campo `created_by` SHALL ser preenchido automaticamente com o `id` do caller. O campo `interest_items` é opcional e SHALL aceitar um array de strings correspondentes a nomes de itens ativos em `portfolio_items`. O service SHALL validar que cada nome existe em `portfolio_items WHERE deleted_at IS NULL` antes de salvar. O campo `cnpj` é obrigatório e SHALL estar no formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos conforme o algoritmo da Receita Federal; o sistema SHALL rejeitar CNPJs com formato incorreto ou dígitos verificadores inválidos com HTTP 400.

#### Scenario: Criação com dados mínimos e CNPJ válido

- **WHEN** `POST /leads` com `company_name`, `cnpj: "12.345.678/0001-90"`, `address_*` (todos obrigatórios exceto `complemento`) e `status` omitido
- **THEN** o sistema SHALL retornar HTTP 201 com o lead criado, `status: 'nao_contatado'`, `interest_items: []` e `cnpj` conforme fornecido

#### Scenario: Criação sem CNPJ

- **WHEN** `POST /leads` sem o campo `cnpj`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Criação com CNPJ em formato inválido

- **WHEN** `POST /leads` com `cnpj: "12345678000190"` (sem formatação)
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Criação com CNPJ formatado mas dígitos verificadores inválidos

- **WHEN** `POST /leads` com `cnpj: "11.111.111/1111-11"` (formato correto, dígitos verificadores inválidos)
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Criação com serviços de interesse válidos

- **WHEN** `POST /leads` com `cnpj` válido e `interest_items: ["Consultoria Energética", "Auditoria Elétrica"]` onde ambos existem em `portfolio_items` ativos
- **THEN** o sistema SHALL retornar HTTP 201 com o lead contendo `interest_items` exatamente como fornecido

#### Scenario: Item de interesse não pertence ao portfólio ativo

- **WHEN** `POST /leads` com `interest_items` contendo nome não existente em `portfolio_items WHERE deleted_at IS NULL`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Campo obrigatório ausente

- **WHEN** `POST /leads` sem `company_name`
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Detalhes de um lead

O sistema SHALL expor `GET /leads/:id` retornando o lead com seus contatos, `interest_items`, `cnpj` e comentários (ordenados por `created_at` ASC).

#### Scenario: Lead encontrado

- **WHEN** `GET /leads/:id` com UUID existente
- **THEN** o sistema SHALL retornar HTTP 200 com lead completo incluindo `cnpj`, arrays `contacts`, `interest_items` e `comments`

#### Scenario: Lead não encontrado

- **WHEN** `GET /leads/:id` com UUID inexistente
- **THEN** o sistema SHALL retornar HTTP 404

### Requirement: Atualização de lead

O sistema SHALL expor `PATCH /leads/:id` aceitando qualquer subconjunto dos campos do lead (exceto `created_by` e `created_at`). O campo `interest_items`, se fornecido, SHALL substituir completamente o array existente. O campo `cnpj`, se fornecido, SHALL estar no formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos conforme o algoritmo da Receita Federal. O service SHALL validar que cada item do novo array existe em `portfolio_items WHERE deleted_at IS NULL`.

#### Scenario: Atualização de status

- **WHEN** `PATCH /leads/:id` com `{ status: 'em_progresso' }` por usuário autorizado
- **THEN** o sistema SHALL retornar HTTP 200 com lead atualizado

#### Scenario: Atualização de CNPJ com formato válido

- **WHEN** `PATCH /leads/:id` com `{ cnpj: "98.765.432/0001-10" }`
- **THEN** o sistema SHALL retornar HTTP 200 com lead atualizado contendo o novo CNPJ

#### Scenario: Atualização de CNPJ com formato inválido

- **WHEN** `PATCH /leads/:id` com `{ cnpj: "invalido" }`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Atualização de CNPJ com dígitos verificadores inválidos

- **WHEN** `PATCH /leads/:id` com `{ cnpj: "11.111.111/1111-11" }` (formato correto, dígitos verificadores inválidos)
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Status inválido

- **WHEN** `PATCH /leads/:id` com `status` fora de `['nao_contatado', 'em_progresso', 'contatado']`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Atualização de interest_items substitui completamente

- **WHEN** `PATCH /leads/:id` com `interest_items: ["Auditoria Elétrica"]` sendo que o lead tinha `["Consultoria Energética", "Auditoria Elétrica"]`
- **THEN** o sistema SHALL retornar HTTP 200 com `interest_items: ["Auditoria Elétrica"]`

#### Scenario: Item inválido em interest_items no update

- **WHEN** `PATCH /leads/:id` com `interest_items` contendo nome não ativo no portfólio
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Exclusão de lead

O sistema SHALL expor `DELETE /leads/:id`. Somente o criador do lead (`created_by`) ou um superuser (rank >= 3) SHALL poder excluir. A exclusão SHALL ser permanente (hard delete) com CASCADE para contatos, interesses e comentários.

#### Scenario: Criador exclui seu próprio lead

- **WHEN** `DELETE /leads/:id` com caller sendo o criador do lead
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Superuser exclui lead de outro usuário

- **WHEN** `DELETE /leads/:id` com caller com rank >= 3 e lead criado por outro
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Usuário autorizado mas não criador e não superuser tenta excluir

- **WHEN** `DELETE /leads/:id` com caller autorizado para leads mas que não é o criador e tem rank < 3
- **THEN** o sistema SHALL retornar HTTP 403

---

### Requirement: Adição de contato a um lead

O sistema SHALL expor `POST /leads/:id/contacts` para adicionar individualmente um contato ao lead. Cada contato SHALL ter `name`, `role` (texto livre) e ao menos `email` ou `phone`.

#### Scenario: Contato com email criado com sucesso

- **WHEN** `POST /leads/:id/contacts` com `{ name: "João", role: "Diretor", email: "joao@empresa.com" }`
- **THEN** o sistema SHALL retornar HTTP 201 com o contato criado incluindo `id`

#### Scenario: Contato sem email nem telefone

- **WHEN** `POST /leads/:id/contacts` com `{ name: "João", role: "Diretor" }` sem `email` e sem `phone`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Lead não encontrado

- **WHEN** `POST /leads/:id/contacts` com `lead_id` inexistente
- **THEN** o sistema SHALL retornar HTTP 404

### Requirement: Edição de contato

O sistema SHALL expor `PATCH /leads/:id/contacts/:contact_id` aceitando qualquer subconjunto de `name`, `role`, `email`, `phone`. A constraint email OR phone SHALL ser mantida após a edição.

#### Scenario: Edição de nome com sucesso

- **WHEN** `PATCH /leads/:id/contacts/:contact_id` com `{ name: "João Silva" }`
- **THEN** o sistema SHALL retornar HTTP 200 com contato atualizado

#### Scenario: Remoção de único meio de contato

- **WHEN** `PATCH /leads/:id/contacts/:contact_id` com `{ email: null }` em contato que só tem email
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Remoção de contato

O sistema SHALL expor `DELETE /leads/:id/contacts/:contact_id` para remover individualmente um contato.

#### Scenario: Remoção com sucesso

- **WHEN** `DELETE /leads/:id/contacts/:contact_id` com IDs válidos
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Contato não encontrado

- **WHEN** `DELETE /leads/:id/contacts/:contact_id` com contact_id inexistente ou não pertencente ao lead
- **THEN** o sistema SHALL retornar HTTP 404

---

### Requirement: Adição de comentário a um lead

O sistema SHALL expor `POST /leads/:id/comments`. O campo `user_id` SHALL ser preenchido com o `id` do caller.

#### Scenario: Comentário criado com sucesso

- **WHEN** `POST /leads/:id/comments` com `{ content: "Cliente demonstrou interesse." }` por usuário autorizado
- **THEN** o sistema SHALL retornar HTTP 201 com `{ id, lead_id, user_id, content, created_at }`

#### Scenario: Content vazio

- **WHEN** `POST /leads/:id/comments` com `content` vazio ou ausente
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Edição de comentário

O sistema SHALL expor `PATCH /leads/:id/comments/:comment_id`. Somente o criador do comentário SHALL poder editá-lo. O campo `updated_at` SHALL ser atualizado.

#### Scenario: Criador edita seu comentário

- **WHEN** `PATCH /leads/:id/comments/:comment_id` com `{ content: "Texto corrigido" }` e caller sendo o criador
- **THEN** o sistema SHALL retornar HTTP 200 com comentário atualizado e `updated_at` preenchido

#### Scenario: Outro usuário tenta editar

- **WHEN** `PATCH /leads/:id/comments/:comment_id` com caller que não é o criador
- **THEN** o sistema SHALL retornar HTTP 403

### Requirement: Exclusão de comentário com hierarquia

O sistema SHALL expor `DELETE /leads/:id/comments/:comment_id`. O caller SHALL poder excluir se: é o criador do comentário OU tem rank estritamente maior que o rank do criador.

#### Scenario: Criador exclui seu comentário

- **WHEN** `DELETE /leads/:id/comments/:comment_id` com caller sendo o criador
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Superior hierárquico exclui comentário de subordinado

- **WHEN** `DELETE /leads/:id/comments/:comment_id` com caller de rank 2 (diretor) e criador de rank 0 (consultor)
- **THEN** o sistema SHALL retornar HTTP 204

#### Scenario: Usuário de rank igual tenta excluir comentário de outro

- **WHEN** `DELETE /leads/:id/comments/:comment_id` com caller de rank 1 e criador de rank 1 e caller não sendo o criador
- **THEN** o sistema SHALL retornar HTTP 403
