## MODIFIED Requirements

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

### Requirement: Listagem de leads

O sistema SHALL expor `GET /leads` retornando todos os leads (sem filtro por criador) com detalhes completos: campos principais incluindo `cnpj`, `contacts` e `comments` (ordenados por `created_at` ASC) de cada lead. O sistema SHALL buscar contatos e comentários em batch (uma query por tabela), não em N+1.

#### Scenario: Listagem retorna todos os leads com contatos e comentários

- **WHEN** `GET /leads` por usuário autorizado
- **THEN** o sistema SHALL retornar HTTP 200 com array de leads contendo `id`, `company_name`, `cnpj`, `status`, `created_by`, `created_at`, `updated_at`, campos de endereço, `contacts` (array) e `comments` (array)

### Requirement: Detalhes de um lead

O sistema SHALL expor `GET /leads/:id` retornando o lead com seus contatos, `interest_items`, `cnpj` e comentários (ordenados por `created_at` ASC).

#### Scenario: Lead encontrado

- **WHEN** `GET /leads/:id` com UUID existente
- **THEN** o sistema SHALL retornar HTTP 200 com lead completo incluindo `cnpj`, arrays `contacts`, `interest_items` e `comments`

#### Scenario: Lead não encontrado

- **WHEN** `GET /leads/:id` com UUID inexistente
- **THEN** o sistema SHALL retornar HTTP 404
