## Context

A empresa opera com horário flexível; sem um mapa de disponibilidade centralizado é impossível coordenar agendamentos entre equipes. O módulo `routine` introduz essa capacidade via quatro endpoints REST, com visibilidade hierárquica de leitura e um sumário de disponibilidade agregado por slot.

## Goals / Non-Goals

**Goals:**
- Persistir a disponibilidade semanal de cada usuário (98 slots: Segunda–Domingo, 08h–22h)
- Permitir que cada usuário atualize sua própria rotina a qualquer momento
- Permitir que superiores leiam a rotina de seus subordinados conforme hierarquia de cargos e setores
- Fornecer um sumário de disponibilidade agrupado por slot para gerentes e superiores

**Non-Goals:**
- Disponibilidade por data específica (rotina é semanal fixa, não por semana)
- Notificações ou alertas de conflito de horários
- Integração com calendários externos

## Decisions

### Modelo de dados: tabela normalizada `routine_slots`

**Decisão**: tabela `routine_slots (user_id, day, hour)` — apenas slots disponíveis são armazenados.

**Alternativa descartada**: coluna JSON `slots jsonb` na tabela `users` ou em tabela `routines` separada.

**Rationale**: o endpoint `GET /routine/summary` agrega slots de múltiplos usuários. Com JSON, essa agregação exigiria processamento em app code (O(N × 98) por request). Com a tabela normalizada, a query usa `GROUP BY day, hour` com índice composto — escala linearmente com o número de usuários sem alterar o código.

```sql
-- Escrita: transação atômica
BEGIN;
DELETE FROM routine_slots WHERE user_id = $1;
INSERT INTO routine_slots (user_id, day, hour) VALUES ($1, $2, $3), ...;
COMMIT;

-- Sumário: query direta com GROUP BY
SELECT rs.day, rs.hour, u.id, u.name, u.role, u.sector
FROM routine_slots rs
JOIN users u ON rs.user_id = u.id
WHERE [filtro de subordinados]
ORDER BY rs.day, rs.hour;
```

### Representação dos dias e horas

**Decisão**: `day` como `smallint` 0–6 (0=segunda, 6=domingo); `hour` como `smallint` 8–21 (8 = slot 08h–09h, 21 = slot 21h–22h).

**Rationale**: inteiros são indexáveis e independentes de locale. A conversão para/de nomes de dia (`mon`, `tue`, etc.) ocorre na camada de serviço.

### Payload da API: grade booleana por dia

**Decisão**: input e output usam objeto com chaves de dia e arrays de 14 booleanos.

```json
{
  "slots": {
    "mon": [true, false, true, ...],
    "tue": [...],
    "wed": [...],
    "thu": [...],
    "fri": [...],
    "sat": [...],
    "sun": [...]
  }
}
```

**Rationale**: espelha diretamente o estado da grade no frontend — zero conversão no cliente. O backend converte o array para pares `(day, hour)` antes de persistir.

### Visibilidade de leitura: lógica no service, não no guard

**Decisão**: a verificação `canView(viewer, target)` fica no `RoutineService`, não no `RoutePolicyGuard`.

**Rationale**: o guard avalia o caller isoladamente (sem acesso ao target). A visibilidade de rotina depende da comparação de rank e setor entre dois usuários, o que requer uma query adicional para buscar o target antes da verificação. Essa lógica pertence ao service.

Regra:
```
canView(viewer, target):
  viewer.id === target.id                                   → autorizado
  viewer.rank > target.rank AND viewer.rank >= 3            → autorizado (superuser, qualquer setor)
  viewer.rank > target.rank AND viewer.sector === target.sector → autorizado
  senão                                                     → 403
```

### Ordem de rotas no controller (NestJS)

**Decisão**: `GET /routine/summary` deve ser declarado antes de `GET /routine/:userId` no controller.

**Rationale**: NestJS resolve rotas na ordem de declaração. Se `:userId` vier primeiro, a string `"summary"` seria capturada como parâmetro e a rota correta nunca seria alcançada.

### Subordinados do sumário

**Decisão**: o filtro de subordinados usa o mesmo critério de visibilidade de leitura, mas aplicado em bulk (via WHERE no banco), retornando todos os usuários que o caller pode visualizar.

| Caller     | Roles visíveis                        | Restrição de setor |
|------------|---------------------------------------|--------------------|
| Gerente    | consultor                             | mesmo setor        |
| Diretor    | gerente, consultor                    | mesmo setor        |
| Assessor   | diretor, gerente, consultor           | nenhuma            |
| Presidente | diretor, gerente, consultor           | nenhuma            |

### Resposta do sumário: aninhada por dia e hora

**Decisão**: objeto aninhado `{ day: { hour: [users] } }` — apenas dias e horas com pelo menos um usuário disponível são incluídos.

```json
{
  "mon": {
    "8":  [{ "id": "...", "name": "...", "role": "consultor", "sector": "projetos" }],
    "9":  [{ "id": "...", "name": "..." , "role": "consultor", "sector": "projetos" }]
  },
  "wed": { ... }
}
```

**Rationale**: estrutura diretamente mapeável para a grade do frontend; omitir slots vazios reduz o payload.

## Risks / Trade-offs

- **Write com DELETE + INSERT**: o upsert não é incremental — toda a rotina é reescrita. Para usuários com 98 slots disponíveis isso significa 98 INSERTs por salvamento. Aceitável no contexto (rotina raramente atualizada, N de usuários baixo). → Mitigação: transação garante consistência; se performance se tornar problema, migrar para `INSERT … ON CONFLICT DO NOTHING` com diff incremental.
- **Consultor sem subordinados no sumário**: a rota retornaria sempre um objeto vazio. O guard bloqueia o acesso no nível de rank para evitar queries desnecessárias.
- **Dois SELECT por `GET /routine/:userId`**: um para buscar o target user (verificar rank/setor), outro para buscar a rotina. Sem impacto significativo no volume atual.
