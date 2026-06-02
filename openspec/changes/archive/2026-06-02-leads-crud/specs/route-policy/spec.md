## MODIFIED Requirements

### Requirement: Estrutura de acesso em dois níveis — mode e rba

O sistema SHALL suportar uma estrutura `access` com dois campos distintos:

- `mode`: portão de entrada — define o nível de autenticação exigido pela rota
- `rba` (role-based access): restrição adicional — só avaliada quando `mode` passa

```typescript
type AccessPolicy =
  | { mode: 'unauthenticated' }
  | { mode: 'unexistent' }
  | { mode: 'authenticated'; rba?: RbaCondition[] };

type RbaCondition =
  | 'self'
  | ['minRank', number]
  | ['sector', string | string[]]
  | ['roleAndSector', { roles: string[]; sectors: string[] }];
```

`rba` é válido apenas com `mode: 'authenticated'` — as condições exigem `request.user` presente, o que só é garantido por esse modo.

## ADDED Requirements

### Requirement: Condição ['roleAndSector'] combina role e setor com lógica AND

A condição `['roleAndSector', { roles, sectors }]` SHALL ser satisfeita quando `roles.includes(caller.role) AND sectors.includes(caller.sector)`, permitindo restringir acesso a uma combinação específica de papel e setor.

#### Scenario: Caller satisfaz role e setor

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'diretor'` e `caller.sector = 'marketing'`
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Caller tem o setor correto mas role errado

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'gerente'` e `caller.sector = 'marketing'`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Caller tem o role correto mas setor errado

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'diretor'` e `caller.sector = 'projetos'`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: roleAndSector composto com outras condições via OR

- **WHEN** `rba: [['sector', 'comercial'], ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'consultor'` e `caller.sector = 'comercial'`
- **THEN** o sistema SHALL permitir o acesso (condição `sector` satisfeita, OR é suficiente)
