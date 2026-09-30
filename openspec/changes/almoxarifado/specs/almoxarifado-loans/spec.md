## ADDED Requirements

### Requirement: Qualquer usuário autenticado pode listar os empréstimos
Um usuário autenticado, independente do rank, SHALL poder listar os empréstimos registrados, incluindo empréstimos ativos e já devolvidos (histórico).

#### Scenario: Listagem bem-sucedida
- **WHEN** um usuário autenticado de qualquer rank envia `GET /almoxarifado/emprestimos`
- **THEN** o sistema SHALL retornar `200` com a lista de todos os empréstimos, incluindo os já devolvidos

#### Scenario: Requisição não autenticada
- **WHEN** uma requisição sem token válido é enviada a `GET /almoxarifado/emprestimos`
- **THEN** o sistema SHALL retornar `401`

### Requirement: Usuário autenticado pode registrar um novo empréstimo
Um usuário autenticado SHALL poder registrar um novo empréstimo informando o material, a quantidade desejada, a data/hora do empréstimo (default: momento da requisição), uma data de devolução prevista e, opcionalmente, observações. O empréstimo SHALL ser associado automaticamente ao usuário autenticado que fez a requisição — o campo do responsável NÃO é aceito no corpo da requisição.

#### Scenario: Empréstimo bem-sucedido
- **WHEN** um usuário autenticado envia `POST /almoxarifado/emprestimos` com `material_id`, `quantidade` e `previsao_devolucao` válidos, e o material tem estoque suficiente
- **THEN** o sistema SHALL criar o registro de empréstimo associado ao usuário autenticado, decrementar `quantidade_estoque` do material em `quantidade`, e retornar `201` com o empréstimo criado

#### Scenario: Estoque insuficiente
- **WHEN** um usuário autenticado envia `POST /almoxarifado/emprestimos` com `quantidade` maior que a `quantidade_estoque` disponível do material
- **THEN** o sistema SHALL retornar `400` e NÃO SHALL alterar `quantidade_estoque`

#### Scenario: Material inexistente
- **WHEN** um usuário autenticado envia `POST /almoxarifado/emprestimos` com um `material_id` que não corresponde a nenhum material cadastrado
- **THEN** o sistema SHALL retornar `404`

#### Scenario: Campos obrigatórios ausentes
- **WHEN** um usuário autenticado envia `POST /almoxarifado/emprestimos` sem `material_id`, `quantidade` ou `previsao_devolucao`
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Quantidade inválida
- **WHEN** um usuário autenticado envia `POST /almoxarifado/emprestimos` com `quantidade` menor ou igual a `0`
- **THEN** o sistema SHALL retornar `400`

#### Scenario: Requisição não autenticada
- **WHEN** uma requisição sem token válido é enviada a `POST /almoxarifado/emprestimos`
- **THEN** o sistema SHALL retornar `401`

### Requirement: Usuário autenticado pode registrar a devolução de um empréstimo
Um usuário autenticado SHALL poder registrar a devolução de um empréstimo ativo via `PATCH /almoxarifado/emprestimos/:id`, informando a data/hora de devolução (default: momento da requisição) e, opcionalmente, observações sobre o estado do material devolvido. Ao registrar a devolução, o sistema SHALL incrementar `quantidade_estoque` do material correspondente na mesma quantidade que foi emprestada, e o registro do empréstimo SHALL ser preservado (não excluído) como histórico da transação.

#### Scenario: Devolução bem-sucedida
- **WHEN** um usuário autenticado envia `PATCH /almoxarifado/emprestimos/:id` para um empréstimo ainda não devolvido
- **THEN** o sistema SHALL marcar o empréstimo como devolvido, registrar `devolvido_em`, incrementar `quantidade_estoque` do material na quantidade original do empréstimo, e retornar `200` com o empréstimo atualizado

#### Scenario: Empréstimo já devolvido
- **WHEN** um usuário autenticado envia `PATCH /almoxarifado/emprestimos/:id` para um empréstimo que já possui `devolvido_em` preenchido
- **THEN** o sistema SHALL retornar `400` e NÃO SHALL alterar `quantidade_estoque` novamente

#### Scenario: Empréstimo não encontrado
- **WHEN** um usuário autenticado envia `PATCH /almoxarifado/emprestimos/:id` com um `id` que não corresponde a nenhum empréstimo
- **THEN** o sistema SHALL retornar `404`

#### Scenario: Requisição não autenticada
- **WHEN** uma requisição sem token válido é enviada a `PATCH /almoxarifado/emprestimos/:id`
- **THEN** o sistema SHALL retornar `401`

### Requirement: Histórico de transações de estoque é preservado
O sistema SHALL manter todo registro de empréstimo (criação e devolução) persistido de forma permanente, sem exclusão, servindo como histórico auditável da movimentação de estoque de cada material ao longo do tempo.

#### Scenario: Empréstimo devolvido continua visível na listagem
- **WHEN** um empréstimo tem sua devolução registrada via `PATCH /almoxarifado/emprestimos/:id`
- **THEN** o registro SHALL continuar aparecendo em `GET /almoxarifado/emprestimos`, agora com `devolvido_em` preenchido, em vez de ser removido
