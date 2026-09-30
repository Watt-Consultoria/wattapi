## ADDED Requirements

### Requirement: Detecção de empréstimos em atraso durante o daily-job
Como parte da execução do `daily-job` (`POST /internal/daily-job`), o sistema SHALL identificar todos os empréstimos de almoxarifado com `devolvido_em IS NULL`, `previsao_devolucao` anterior ao momento da execução, e `atraso_notificado_em IS NULL`.

#### Scenario: Existem empréstimos vencidos ainda não notificados
- **WHEN** o daily-job é executado
- **AND** existem registros em `almoxarifado_emprestimos` com `devolvido_em IS NULL`, `previsao_devolucao < now()` e `atraso_notificado_em IS NULL`
- **THEN** o sistema SHALL processar cada um desses empréstimos para notificação

#### Scenario: Não há empréstimos em atraso
- **WHEN** o daily-job é executado
- **AND** não existem empréstimos com `devolvido_em IS NULL` e `previsao_devolucao < now()`
- **THEN** o sistema SHALL não criar nenhuma notificação de atraso e continuar sem erro

#### Scenario: Empréstimo em atraso já notificado anteriormente não é processado novamente
- **WHEN** o daily-job é executado
- **AND** um empréstimo em atraso já possui `atraso_notificado_em` preenchido (de uma execução anterior)
- **THEN** o sistema SHALL ignorá-lo nesta execução, não criando notificações duplicadas nem alterando `atraso_notificado_em` novamente

### Requirement: Notificação ao responsável pelo empréstimo em atraso
Para cada empréstimo em atraso identificado, o sistema SHALL criar uma notificação (`origin='automatic'`, `created_by=NULL`) para o usuário responsável pelo empréstimo (`almoxarifado_emprestimos.user_id`).

#### Scenario: Usuário responsável é notificado
- **WHEN** o empréstimo `E` está em atraso e ainda não foi notificado
- **THEN** o sistema SHALL inserir uma notificação com `user_id = E.user_id`, mencionando o nome do material e o atraso

### Requirement: Notificação aos gerentes de projeto sobre empréstimo em atraso
Para cada empréstimo em atraso identificado, o sistema SHALL criar uma notificação (`origin='automatic'`, `created_by=NULL`) para cada usuário ativo com `role='gerente'` e `sector='projetos'` (gerentes de projeto), mencionando o material, o responsável pelo empréstimo e o atraso.

#### Scenario: Existem gerentes de projeto cadastrados
- **WHEN** o empréstimo `E` está em atraso e existem N usuários ativos com `role='gerente' AND sector='projetos'`
- **THEN** o sistema SHALL inserir N notificações, uma para cada gerente de projeto, referenciando o material e o responsável pelo empréstimo `E`

#### Scenario: Nenhum gerente de projeto cadastrado
- **WHEN** o empréstimo `E` está em atraso e não existe nenhum usuário ativo com `role='gerente' AND sector='projetos'`
- **THEN** o sistema SHALL ainda assim notificar o responsável pelo empréstimo (requisito anterior), sem erro por ausência de gerentes de projeto

### Requirement: Empréstimo em atraso é marcado como notificado
Após criar as notificações de um empréstimo em atraso, o sistema SHALL gravar `atraso_notificado_em = now()` nesse empréstimo, garantindo que ele não seja notificado novamente em execuções futuras do daily-job.

#### Scenario: Marcação após notificação bem-sucedida
- **WHEN** as notificações de um empréstimo em atraso são criadas com sucesso
- **THEN** `almoxarifado_emprestimos.atraso_notificado_em` SHALL ser atualizado para o timestamp da execução

### Requirement: Resumo do daily-job inclui contagem de notificações de atraso
A resposta de `POST /internal/daily-job` SHALL incluir a quantidade total de notificações de atraso de empréstimo criadas na execução (soma das notificações ao responsável e aos gerentes de projeto).

#### Scenario: Resumo reflete notificações de atraso criadas
- **WHEN** o daily-job cria notificações de atraso para 2 empréstimos, cada um gerando 1 notificação ao responsável e 3 aos gerentes de projeto
- **THEN** a resposta SHALL incluir o campo correspondente com valor `8`
