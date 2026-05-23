### Requirement: Definir hierarquia ordinal de roles
O sistema SHALL mapear cada role a um valor numérico de rank que representa sua posição na hierarquia: `consultor=0`, `gerente=1`, `diretor=2`, `assessor=3`, `presidente=4`. Roles de rank >= 3 são considerados superusuários.

#### Scenario: Rank correto para cada role
- **WHEN** o sistema consulta o rank de qualquer role válido
- **THEN** SHALL retornar: consultor→0, gerente→1, diretor→2, assessor→3, presidente→4

#### Scenario: Superuser é definido por rank >= 3
- **WHEN** o sistema verifica se um usuário é superusuário
- **THEN** SHALL considerar superusuário apenas roles com rank >= 3 (assessor e presidente)

### Requirement: Comparação de rank para autorização entre usuários
O sistema SHALL permitir ação de um caller sobre um target apenas quando `rank(caller) > rank(target)`, garantindo que nenhum usuário pode agir sobre outro de rank igual ou superior.

#### Scenario: Presidente pode agir sobre assessor
- **WHEN** caller tem role `presidente` (rank 4) e target tem role `assessor` (rank 3)
- **THEN** a comparação SHALL retornar autorizado (4 > 3)

#### Scenario: Assessor não pode agir sobre presidente
- **WHEN** caller tem role `assessor` (rank 3) e target tem role `presidente` (rank 4)
- **THEN** a comparação SHALL retornar não autorizado (3 > 4 é falso)

#### Scenario: Usuário não pode agir sobre outro de mesmo rank
- **WHEN** caller e target possuem o mesmo role
- **THEN** a comparação SHALL retornar não autorizado (rank igual não satisfaz rank(caller) > rank(target))
