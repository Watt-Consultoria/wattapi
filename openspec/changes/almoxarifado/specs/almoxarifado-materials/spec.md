## ADDED Requirements

### Requirement: Qualquer usuário autenticado pode listar os materiais do almoxarifado
Um usuário autenticado, independente do rank, SHALL poder listar todos os materiais cadastrados no almoxarifado, incluindo id, nome, descrição, quantidade em estoque e observações.

#### Scenario: Listagem bem-sucedida
- **WHEN** um usuário autenticado de qualquer rank envia `GET /almoxarifado/material`
- **THEN** o sistema SHALL retornar `200` com a lista de todos os materiais cadastrados

#### Scenario: Requisição não autenticada
- **WHEN** uma requisição sem token válido é enviada a `GET /almoxarifado/material`
- **THEN** o sistema SHALL retornar `401`

### Requirement: Gerente e acima podem cadastrar um novo material
Um usuário com rank >= 1 (`gerente` e acima) SHALL poder cadastrar um novo material informando nome, descrição, quantidade inicial em estoque e, opcionalmente, observações sobre o estado do item.

#### Scenario: Cadastro bem-sucedido
- **WHEN** um usuário com rank >= 1 envia `POST /almoxarifado/material` com `nome`, `descricao` e `quantidade_estoque` válidos
- **THEN** o sistema SHALL persistir o material e retornar `201` com o registro criado

#### Scenario: Campos obrigatórios ausentes
- **WHEN** um usuário com rank >= 1 envia `POST /almoxarifado/material` sem `nome`, `descricao` ou `quantidade_estoque`
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Quantidade em estoque negativa
- **WHEN** um usuário com rank >= 1 envia `POST /almoxarifado/material` com `quantidade_estoque` menor que `0`
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Usuário sem rank suficiente tenta cadastrar
- **WHEN** um usuário com rank 0 (`consultor`) envia `POST /almoxarifado/material`
- **THEN** o sistema SHALL retornar `403`

#### Scenario: Requisição não autenticada
- **WHEN** uma requisição sem token válido é enviada a `POST /almoxarifado/material`
- **THEN** o sistema SHALL retornar `401`

### Requirement: Gerente e acima podem atualizar um material existente
Um usuário com rank >= 1 (`gerente` e acima) SHALL poder atualizar campos de um material existente (nome, descrição, quantidade em estoque e/ou observações).

#### Scenario: Atualização bem-sucedida
- **WHEN** um usuário com rank >= 1 envia `PATCH /almoxarifado/material/:id` com ao menos um campo válido
- **THEN** o sistema SHALL atualizar o material e retornar `200` com o registro atualizado

#### Scenario: Nenhum campo informado
- **WHEN** um usuário com rank >= 1 envia `PATCH /almoxarifado/material/:id` sem nenhum campo no corpo
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Material não encontrado
- **WHEN** um usuário com rank >= 1 envia `PATCH /almoxarifado/material/:id` com um `id` que não corresponde a nenhum material
- **THEN** o sistema SHALL retornar `404`

#### Scenario: Quantidade em estoque negativa
- **WHEN** um usuário com rank >= 1 envia `PATCH /almoxarifado/material/:id` com `quantidade_estoque` menor que `0`
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Usuário sem rank suficiente tenta atualizar
- **WHEN** um usuário com rank 0 (`consultor`) envia `PATCH /almoxarifado/material/:id`
- **THEN** o sistema SHALL retornar `403`
