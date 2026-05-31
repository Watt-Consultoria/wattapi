## ADDED Requirements

### Requirement: Superior consulta sumário de disponibilidade dos subordinados
O sistema SHALL disponibilizar `GET /routine/summary` para usuários com rank >= 1 (gerente ou superior). O endpoint retorna dois campos complementares:

- **`availability`** — para cada combinação de dia e hora com pelo menos um subordinado disponível, a lista dos subordinados disponíveis naquele slot. Subordinados sem rotina configurada não aparecem aqui.
- **`unconfigured`** — lista de subordinados que nunca configuraram sua rotina, ordenada por nome.

Definição de subordinados por role do caller:

| Caller     | Roles incluídos               | Restrição de setor |
|------------|-------------------------------|--------------------|
| Gerente    | consultor                     | mesmo setor        |
| Diretor    | gerente, consultor            | mesmo setor        |
| Assessor   | diretor, gerente, consultor   | nenhuma            |
| Presidente | diretor, gerente, consultor   | nenhuma            |

Formato da resposta: objeto com `availability` (aninhado por dia `mon`–`sun` e hora `"8"`–`"21"`, omitindo dias/horas sem disponibilidade) e `unconfigured` (array plano). Cada entrada de usuário contém: `id`, `name`, `role`, `sector`.

```json
{
  "availability": {
    "mon": {
      "8": [{ "id": "...", "name": "Ana", "role": "consultor", "sector": "projetos" }]
    },
    "wed": {
      "14": [{ "id": "...", "name": "Ana", "role": "consultor", "sector": "projetos" },
             { "id": "...", "name": "Carlos", "role": "gerente", "sector": "projetos" }]
    }
  },
  "unconfigured": [
    { "id": "...", "name": "Pedro", "role": "consultor", "sector": "comercial" }
  ]
}
```

#### Scenario: Gerente consulta sumário com subordinados disponíveis
- **WHEN** caller tem role `gerente` e setor `projetos`, e existem consultores do mesmo setor com rotina configurada
- **THEN** o sistema SHALL retornar HTTP 200 com `availability` contendo apenas os slots onde há pelo menos um consultor disponível, e `unconfigured` com consultores do mesmo setor que não configuraram rotina

#### Scenario: Assessor consulta sumário com subordinados de múltiplos setores
- **WHEN** caller tem role `assessor` e existem diretores, gerentes e consultores de setores variados — alguns com rotina e outros sem
- **THEN** o sistema SHALL retornar HTTP 200 com `availability` incluindo todos os que configuraram, e `unconfigured` listando os que não configuraram, sem filtro de setor

#### Scenario: Nenhum subordinado possui rotina configurada
- **WHEN** caller tem subordinados mas nenhum deles configurou sua rotina
- **THEN** o sistema SHALL retornar HTTP 200 com `availability: {}` e `unconfigured` com a lista de todos os subordinados

#### Scenario: Caller não possui subordinados visíveis
- **WHEN** caller tem subordinados por role mas nenhum existe no setor permitido
- **THEN** o sistema SHALL retornar HTTP 200 com `{ "availability": {}, "unconfigured": [] }`

#### Scenario: Consultor tenta acessar o sumário
- **WHEN** caller tem role `consultor` (rank 0)
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Usuário não autenticado tenta acessar o sumário
- **WHEN** request sem token JWT válido chega a `GET /routine/summary`
- **THEN** o sistema SHALL retornar HTTP 401
