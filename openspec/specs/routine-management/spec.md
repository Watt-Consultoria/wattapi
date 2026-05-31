## ADDED Requirements

### Requirement: Usuário salva sua rotina semanal
O sistema SHALL permitir que um usuário autenticado salve ou atualize sua disponibilidade semanal via `PUT /routine`, enviando um objeto com chaves de dia (`mon`–`sun`) e arrays de 14 booleanos (índice 0 = 08h, índice 13 = 21h). Apenas o próprio usuário pode gravar sua rotina. A operação é um upsert atômico: todos os slots anteriores são substituídos pelos novos.

#### Scenario: Salva rotina válida com sucesso
- **WHEN** usuário autenticado envia `PUT /routine` com payload `{ slots: { mon: [bool×14], ..., sun: [bool×14] } }`
- **THEN** o sistema SHALL persistir apenas os slots marcados como `true`, apagar os anteriores e retornar HTTP 200

#### Scenario: Payload com dia faltando
- **WHEN** o payload omite um ou mais dias (ex: sem chave `sat`)
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Array de horas com tamanho errado
- **WHEN** algum dia possui array com tamanho diferente de 14
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Rotina abaixo do mínimo configurado
- **WHEN** a configuração `min_availability_hours` é maior que zero e o payload possui menos slots disponíveis (`true`) do que o valor configurado
- **THEN** o sistema SHALL retornar HTTP 400 com mensagem descritiva indicando a quantidade atual de horas configuradas, o mínimo exigido e quantas horas faltam (ex: "Disponibilidade insuficiente: você configurou 5h de disponibilidade, mas o mínimo exigido é 10h. Adicione mais 5h de disponibilidade.")

#### Scenario: Rotina com zero slots quando mínimo é zero
- **WHEN** `min_availability_hours` é 0 (padrão) e o payload contém todos os slots como `false`
- **THEN** o sistema SHALL aceitar a rotina e retornar HTTP 200 (sem restrição de mínimo)

#### Scenario: Usuário não autenticado tenta salvar
- **WHEN** request sem token JWT válido chega a `PUT /routine`
- **THEN** o sistema SHALL retornar HTTP 401

### Requirement: Usuário recupera sua própria rotina
O sistema SHALL retornar a rotina semanal do próprio usuário autenticado via `GET /routine`. Se o usuário nunca configurou sua rotina, o campo `slots` SHALL ser `null`.

#### Scenario: Rotina configurada
- **WHEN** usuário autenticado chama `GET /routine` e possui rotina salva
- **THEN** o sistema SHALL retornar HTTP 200 com `{ "slots": { "mon": [bool×14], ..., "sun": [bool×14] } }`

#### Scenario: Rotina não configurada
- **WHEN** usuário autenticado chama `GET /routine` e nunca salvou rotina
- **THEN** o sistema SHALL retornar HTTP 200 com `{ "slots": null }`

### Requirement: Superior visualiza rotina de subordinado
O sistema SHALL permitir que um usuário autenticado visualize a rotina de outro usuário via `GET /routine/:userId`, desde que a regra `canView` seja satisfeita. A rota `GET /routine/summary` SHALL ser declarada antes de `GET /routine/:userId` no controller para evitar conflito de roteamento no NestJS.

Regra `canView(viewer, target)`:
- `viewer.id === target.id` → autorizado
- `viewer.rank > target.rank` AND `viewer.rank >= 3` → autorizado (qualquer setor)
- `viewer.rank > target.rank` AND `viewer.sector === target.sector` → autorizado
- Demais casos → negado

Mapeamento de rank: `consultor=0`, `gerente=1`, `diretor=2`, `assessor=3`, `presidente=4`.

#### Scenario: Gerente visualiza rotina de consultor do mesmo setor
- **WHEN** caller tem role `gerente` e setor `projetos`, target tem role `consultor` e setor `projetos`
- **THEN** o sistema SHALL retornar HTTP 200 com a rotina do target

#### Scenario: Gerente tenta visualizar rotina de consultor de outro setor
- **WHEN** caller tem role `gerente` e setor `projetos`, target tem role `consultor` e setor `comercial`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Assessor visualiza rotina de diretor de qualquer setor
- **WHEN** caller tem role `assessor`, target tem role `diretor` (qualquer setor)
- **THEN** o sistema SHALL retornar HTTP 200 com a rotina do target

#### Scenario: Consultor tenta visualizar rotina de outro consultor
- **WHEN** caller tem role `consultor` e target é outro usuário com role `consultor`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário visualiza a própria rotina via `:userId`
- **WHEN** caller envia `GET /routine/:userId` onde `:userId` é o próprio id do caller
- **THEN** o sistema SHALL retornar HTTP 200 com sua rotina (mesma lógica do `GET /routine`)

#### Scenario: Target não possui rotina configurada
- **WHEN** a regra `canView` autoriza o acesso mas o target nunca configurou sua rotina
- **THEN** o sistema SHALL retornar HTTP 200 com `{ "slots": null }`

#### Scenario: Target não existe
- **WHEN** `:userId` não corresponde a nenhum usuário ativo
- **THEN** o sistema SHALL retornar HTTP 404
