### Requirement: Cargo Diretor de VEMKTU — visibilidade multi-setor
O Diretor de VEMKTU é um cargo fixo que acumula a direção dos setores `comercial` e `marketing` simultaneamente. Qualquer usuário com `role = 'diretor'` e `sector` igual a `'comercial'` ou `'marketing'` SHALL enxergar subordinados (usuários de rank inferior) de ambos os setores, como se pertencessem a um único setor unificado.

Esta regra é implementada via a função `getVisibleSectors(sector, role)` em `role-hierarchy.ts`, que retorna `['comercial', 'marketing']` quando o diretor pertence a um desses setores, e `[sector]` para qualquer outro caso. Todos os filtros de visibilidade hierárquica SHALL consumir esse helper em vez de comparar `sector` diretamente.

**Módulos que implementam esse filtro e devem usar `getVisibleSectors`:**
- `activities.service.ts` — cláusula `u.sector = ANY($n::text[])` em `findAll`
- `routine.service.ts` — funções `buildSubordinatesFilter` e `canView` (aplicar quando o módulo de routine for mergeado)

#### Scenario: Diretor de VEMKTU vê subordinados de ambos os setores
- **GIVEN** um usuário com `role = 'diretor'` e `sector = 'comercial'` (ou `'marketing'`)
- **WHEN** consulta qualquer endpoint de listagem com filtro hierárquico
- **THEN** SHALL receber subordinados de `comercial` E de `marketing`

#### Scenario: Diretor de outro setor não é afetado
- **GIVEN** um usuário com `role = 'diretor'` e `sector = 'projetos'`
- **WHEN** consulta qualquer endpoint de listagem com filtro hierárquico
- **THEN** SHALL receber apenas subordinados de `projetos`, sem expansão

#### Scenario: Roles abaixo de diretor não herdam a regra
- **GIVEN** um usuário com `role = 'gerente'` e `sector = 'comercial'`
- **WHEN** consulta qualquer endpoint de listagem com filtro hierárquico
- **THEN** SHALL receber apenas subordinados de `comercial`, sem expansão para `marketing`

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
