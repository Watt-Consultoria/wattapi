## ADDED Requirements

### Requirement: Placar das casas
O sistema SHALL permitir que qualquer usuário autenticado consulte o placar das casas via `GET /gamification/leaderboard`. Por padrão retorna o ciclo ativo; aceita `?cycle_id=<uuid>` para consultar ciclos históricos.

#### Scenario: Placar do ciclo ativo
- **WHEN** usuário autenticado faz `GET /gamification/leaderboard`
- **THEN** sistema retorna as 3 casas com `total_points` somado das submissões `approved` no ciclo ativo, ordenadas por pontuação decrescente

#### Scenario: Placar de ciclo histórico
- **WHEN** usuário autenticado faz `GET /gamification/leaderboard?cycle_id=<uuid>`
- **THEN** sistema retorna o placar calculado para o ciclo especificado

#### Scenario: Nenhum ciclo ativo e sem parâmetro
- **WHEN** usuário faz `GET /gamification/leaderboard` sem `cycle_id` e não há ciclo ativo
- **THEN** sistema retorna `404 Not Found`

#### Scenario: Ciclo inexistente
- **WHEN** usuário faz `GET /gamification/leaderboard?cycle_id=<uuid-invalido>`
- **THEN** sistema retorna `404 Not Found`

---

### Requirement: Pódio individual por casa
O sistema SHALL permitir que qualquer usuário autenticado consulte o ranking individual dos membros de uma casa via `GET /gamification/leaderboard/podium?house_id=<uuid>`. Aceita `?cycle_id=<uuid>` para ciclos históricos; padrão é o ciclo ativo.

#### Scenario: Pódio do ciclo ativo
- **WHEN** usuário autenticado faz `GET /gamification/leaderboard/podium?house_id=<uuid>`
- **THEN** sistema retorna membros da casa com `points_contributed` (soma de pontos das submissões aprovadas) e `approved_count` (número de submissões aprovadas), ordenados por `points_contributed` decrescente

#### Scenario: Pódio de ciclo histórico
- **WHEN** usuário faz `GET /gamification/leaderboard/podium?house_id=<uuid>&cycle_id=<uuid>`
- **THEN** sistema retorna o ranking calculado para aquele ciclo

#### Scenario: Casa sem membros com submissões aprovadas
- **WHEN** usuário consulta pódio de uma casa que não tem submissões aprovadas no ciclo
- **THEN** sistema retorna lista vazia (não é erro)

#### Scenario: House_id obrigatório
- **WHEN** usuário faz `GET /gamification/leaderboard/podium` sem `house_id`
- **THEN** sistema retorna `400 Bad Request`
