## ADDED Requirements

### Requirement: Submissão de avaliação estruturada do candidato
Um consultor vinculado a um booking pode submeter uma avaliação do candidato composta por 12 qualidades desejadas (nota 1–5), 6 habilidades indesejadas (booleano: true = candidato apresentou o comportamento) e um campo de observações opcional. A avaliação é única por booking e imutável após criação.

#### Scenario: Avaliação bem-sucedida com todos os campos
- **WHEN** um consultor vinculado ao booking submete notas válidas para as 12 qualidades, valores booleanos para as 6 habilidades indesejadas e observações opcionais
- **THEN** o sistema insere a avaliação em `psel_interview_evaluations` e retorna 201 com os dados da avaliação criada

#### Scenario: Avaliação bem-sucedida sem observações
- **WHEN** um consultor submete a avaliação sem o campo `observacoes`
- **THEN** o sistema insere a avaliação com `observacoes = NULL` e retorna 201

#### Scenario: Nota fora do intervalo permitido
- **WHEN** o consultor envia uma nota menor que 1 ou maior que 5 em qualquer qualidade desejada
- **THEN** o sistema retorna 400

#### Scenario: Campo obrigatório ausente
- **WHEN** o consultor envia o body sem um ou mais campos obrigatórios (qualquer qualidade desejada ou habilidade indesejada)
- **THEN** o sistema retorna 400

#### Scenario: Avaliação já existente para o booking
- **WHEN** um consultor tenta submeter avaliação para um booking que já possui avaliação registrada
- **THEN** o sistema retorna 409

#### Scenario: Usuário não vinculado ao booking
- **WHEN** um usuário autenticado que não é consultor daquele booking tenta submeter a avaliação
- **THEN** o sistema retorna 403

#### Scenario: Booking inexistente
- **WHEN** o consultor informa um `bookingId` (path param) que não existe
- **THEN** o sistema retorna 404

#### Scenario: Requisição sem autenticação
- **WHEN** a rota é chamada sem token de autenticação
- **THEN** o sistema retorna 401
