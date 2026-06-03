### Requirement: Modelo de dados de violations
A tabela `member_violations` SHALL armazenar as faltas aplicadas com os campos: `id` (UUID, PK), `user_id` (UUID, NOT NULL, FK → users.id — membro infrator), `norm_id` (UUID, NOT NULL, FK → company_norms.id), `applied_by` (UUID, NOT NULL, FK → users.id — quem aplicou), `reason` (TEXT, nullable — justificativa opcional), `expires_at` (TIMESTAMPTZ, NOT NULL — `applied_at + interval '1 year'`), `cancelled_at` (TIMESTAMPTZ, nullable — null = ativa), `cancelled_by` (UUID, FK → users.id, nullable), `applied_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()), `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()).

#### Scenario: Estrutura da tabela
- **WHEN** a migration `create-member-violations-table.sql` é aplicada
- **THEN** a tabela `member_violations` existe com todas as colunas e FKs definidas

#### Scenario: expires_at é calculado automaticamente
- **WHEN** uma violation é inserida sem `expires_at` explícito
- **THEN** `expires_at` SHALL ser `applied_at + interval '1 year'`

### Requirement: Sistema de pontuação acumulada
O sistema SHALL calcular um score acumulado por membro baseado nas violations **ativas** (não canceladas e não expiradas). Pontuação: `leve=1pt`, `moderada=2pt`, `grave=6pt`, `desligamento=18pt`. Score total >= 18 indica risco de desligamento (`at_risk = true`).

#### Scenario: Score calculado com violations ativas
- **WHEN** um membro tem 2 leves ativas, 1 moderada ativa e 1 grave ativa
- **THEN** score = (2×1) + (1×2) + (1×6) = 10, `at_risk = false`

#### Scenario: Score ignora violations canceladas
- **WHEN** um membro tem 1 grave cancelada e 2 graves ativas
- **THEN** score = 2×6 = 12 (apenas as ativas contam)

#### Scenario: Score ignora violations expiradas
- **WHEN** um membro tem violations com `expires_at < now()`
- **THEN** essas violations NÃO são contabilizadas no score

#### Scenario: at_risk ativo quando score >= 18
- **WHEN** o score acumulado de um membro é >= 18
- **THEN** `at_risk = true` no summary

#### Scenario: Violation de severity desligamento sozinha dispara at_risk
- **WHEN** um membro tem 1 violation de severity `desligamento` ativa
- **THEN** score = 18, `at_risk = true`

### Requirement: Listar violations dos subordinados
`GET /violations` SHALL retornar violations dos membros visíveis ao caller na hierarquia, sem o campo `applied_by`. Com `?userId=` filtra para um único membro. Cada membro na resposta SHALL incluir seu `summary` (score, contagens por severidade, at_risk). Violations canceladas e expiradas são incluídas mas marcadas com status diferente.

A visibilidade segue a hierarquia:
- Consultor (rank 0): nenhum subordinado — retorna lista vazia
- Gerente (rank 1): consultores do mesmo setor
- Diretor (rank 2): gerentes e consultores dos setores visíveis via `getVisibleSectors()`
- Assessor/Presidente (rank >= 3): todos os membros

#### Scenario: Gerente vê violations dos seus consultores
- **WHEN** um gerente comercial chama `GET /violations`
- **THEN** o sistema retorna violations apenas dos consultores do setor comercial

#### Scenario: Diretor VEMKTU vê violações de comercial e marketing
- **WHEN** um diretor com sector `comercial` chama `GET /violations`
- **THEN** o sistema retorna violations de gerentes e consultores dos setores `comercial` e `marketing`

#### Scenario: Presidente vê violations de todos
- **WHEN** um usuário com role `presidente` chama `GET /violations`
- **THEN** o sistema retorna violations de todos os membros ativos

#### Scenario: Filtro por userId
- **WHEN** `GET /violations?userId=<id>` é chamado por um caller com autoridade sobre o membro
- **THEN** o sistema retorna apenas as violations daquele membro com seu summary

#### Scenario: userId de membro fora da hierarquia retorna 403
- **WHEN** `GET /violations?userId=<id>` é chamado e o caller NÃO tem autoridade sobre o membro
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: applied_by está ausente na resposta
- **WHEN** `GET /violations` retorna violations
- **THEN** o campo `applied_by` NÃO está presente em nenhum item da lista

#### Scenario: Summary inclui apenas violations ativas no score
- **WHEN** um membro tem violations canceladas e ativas
- **THEN** o `summary.score` conta apenas as ativas; as canceladas aparecem na lista com `status: 'cancelled'`

### Requirement: Ver violation própria
`GET /violations/me` SHALL retornar as violations do próprio caller, sem `applied_by`, com summary acumulado. Violations canceladas e expiradas são incluídas com status correspondente.

#### Scenario: Caller vê suas próprias violations
- **WHEN** um membro autenticado chama `GET /violations/me`
- **THEN** o sistema retorna apenas as violations onde `user_id = caller.id`, com summary

#### Scenario: applied_by está ausente
- **WHEN** `GET /violations/me` retorna violations
- **THEN** o campo `applied_by` NÃO está presente em nenhum item

### Requirement: Ver violation por ID
`GET /violations/:id` SHALL retornar os detalhes completos de uma falta, **incluindo** o campo `applied_by`. O caller deve ser o dono da violation (user_id = caller) OU ter autoridade hierárquica sobre o dono.

#### Scenario: Dono da violation vê detalhes completos
- **WHEN** o membro infrator chama `GET /violations/:id` para sua própria violation
- **THEN** o sistema retorna a violation completa incluindo `applied_by`

#### Scenario: Superior hierárquico vê detalhes completos
- **WHEN** um gerente chama `GET /violations/:id` para violation de um seu consultor
- **THEN** o sistema retorna a violation completa incluindo `applied_by`

#### Scenario: Caller sem autoridade recebe 403
- **WHEN** um membro chama `GET /violations/:id` para violation de alguém fora de sua hierarquia
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: Violation não encontrada retorna 404
- **WHEN** `GET /violations/:id` é chamado com ID inexistente
- **THEN** o sistema retorna 404 Not Found

### Requirement: Aplicar falta
`POST /violations` SHALL permitir que superiores hierárquicos apliquem faltas a seus subordinados. Body: `userId` (obrigatório — ID do membro infrator), `normId` (obrigatório — ID da norma violada), `reason` (opcional). Retorna a violation criada com status 201. Após criação bem-sucedida, um email de notificação SHALL ser enviado ao membro.

A autorização é validada no service:
- Superuser (rank >= 3): pode aplicar a qualquer membro ativo
- Outros: `rank(caller) > rank(target)` AND `target.sector ∈ getVisibleSectors(caller.sector, caller.role)`

#### Scenario: Superior aplica falta a subordinado
- **WHEN** um gerente comercial aplica uma falta a um consultor comercial via `POST /violations`
- **THEN** a violation é criada com `expires_at = applied_at + 1 year` e o sistema retorna 201

#### Scenario: Presidente aplica falta a qualquer membro
- **WHEN** o presidente aplica uma falta a qualquer membro via `POST /violations`
- **THEN** a violation é criada com sucesso independente de setor

#### Scenario: Caller sem autoridade hierárquica é rejeitado
- **WHEN** um gerente comercial tenta aplicar falta a um consultor de projetos
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: Consultor não pode aplicar faltas
- **WHEN** um usuário com role `consultor` chama `POST /violations`
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: Norma inexistente é rejeitada
- **WHEN** `POST /violations` é chamado com `normId` que não existe na tabela
- **THEN** o sistema retorna 404 Not Found

#### Scenario: Membro alvo inativo não pode receber falta
- **WHEN** `POST /violations` é chamado com `userId` de um membro inativo
- **THEN** o sistema retorna 404 Not Found

#### Scenario: Email é enviado após criação
- **WHEN** a violation é criada com sucesso
- **THEN** um email de notificação SHALL ser disparado para o email do membro infrator (falha no email não cancela a criação)

### Requirement: Cancelar falta
`DELETE /violations/:id` SHALL realizar soft-delete da violation, setando `cancelled_at = now()` e `cancelled_by = caller.id`. Violations canceladas continuam sendo retornadas nas listagens com `status: 'cancelled'` mas NÃO entram no cálculo do score.

A autorização exige: `rank(caller) > rank(applied_by_user)` OR `caller.id = violation.applied_by`. Superusers (rank >= 3) podem cancelar qualquer falta.

#### Scenario: Aplicador cancela sua própria falta
- **WHEN** o usuário que aplicou a falta chama `DELETE /violations/:id`
- **THEN** `cancelled_at` e `cancelled_by` são setados e o sistema retorna 204

#### Scenario: Superior hierárquico do aplicador cancela falta
- **WHEN** um usuário com `rank > rank(applied_by)` chama `DELETE /violations/:id`
- **THEN** a violation é cancelada com sucesso

#### Scenario: Gerente não pode cancelar falta aplicada pelo presidente
- **WHEN** um gerente (rank 1) tenta cancelar uma falta aplicada pelo presidente (rank 4)
- **THEN** o sistema retorna 403 Forbidden

#### Scenario: Violation já cancelada retorna 409
- **WHEN** `DELETE /violations/:id` é chamado em uma violation já cancelada
- **THEN** o sistema retorna 409 Conflict

#### Scenario: Violation não encontrada retorna 404
- **WHEN** `DELETE /violations/:id` é chamado com ID inexistente
- **THEN** o sistema retorna 404 Not Found
