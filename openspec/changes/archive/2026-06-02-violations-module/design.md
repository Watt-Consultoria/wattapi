## Context

O projeto é uma API NestJS com PostgreSQL via Supabase. A autenticação usa JWT e o sistema de autorização é baseado em `role` (consultor/gerente/diretor/assessor/presidente) e `sector` (comercial/marketing/projetos), com um guard `RoutePolicyGuard` e a função `getVisibleSectors()` para a exceção do Diretor de VEMKTU. Não existe infraestrutura de email transacional — esse módulo introduz a primeira.

## Goals / Non-Goals

**Goals:**
- Persistir normas do estatuto e violations com histórico auditável
- Controle hierárquico de autorização para aplicar e cancelar faltas
- Sistema de pontuação acumulada com threshold de desligamento
- Notificação por email ao membro infrator via Resend

**Non-Goals:**
- Fluxo automatizado de desligamento (o score >= 18 é apenas informacional)
- Interface de aprovação/contestação de faltas
- Histórico de alterações de normas (audit log)

## Decisions

### D1: EmailModule global com Resend SDK

**Decisão:** Criar `EmailModule` como `@Global()` com `EmailService` que encapsula o cliente Resend. Injetado no `ViolationsModule` e chamado diretamente no service após a inserção da falta.

**Alternativas consideradas:**
- *Nodemailer + SMTP*: mais config, sem retry nativo, depende de servidor SMTP externo
- *Supabase Edge Function*: split de lógica entre API e Supabase, mais difícil de testar
- *Fila de emails (BullMQ)*: over-engineering para o volume atual; pode ser adicionado depois se necessário

**Rationale:** Resend tem SDK TypeScript oficial, free tier de 3k emails/mês, e a chamada direta (fire-and-forget com try/catch) é suficiente para o volume atual. A falha no envio de email não deve bloquear a criação da falta.

---

### D2: Autorização no service, não apenas no RoutePolicy

**Decisão:** A verificação "pode aplicar falta a este membro específico" acontece no `ViolationsService`, não no `RoutePolicyGuard`. O guard apenas exige `mode: 'authenticated'` + `minRank: 1` (gerentes em diante podem aplicar; consultores não podem).

**Rationale:** O `RoutePolicyGuard` valida propriedades do *caller*, não do *target*. A lógica `rank(caller) > rank(target) AND mesmoSetor(caller, target)` requer buscar o usuário alvo no banco — isso pertence ao service layer.

**Implementação:**
```
canApply(caller, target):
  if rank(caller) >= 3 → true (superuser)
  if rank(caller) <= rank(target) → false
  return getVisibleSectors(caller.sector, caller.role).includes(target.sector)
```

---

### D3: Autorização de cancelamento via rank do aplicador

**Decisão:** Para cancelar uma falta: `rank(caller) > rank(applied_by_user)` OR `caller.id === violation.applied_by`.

**Rationale:** Impede que um gerente desfaça uma decisão do presidente. O próprio aplicador sempre pode corrigir um erro. Superusers (rank >= 3) podem cancelar qualquer falta.

---

### D4: Score calculado dinamicamente, não armazenado

**Decisão:** O summary (score, contagens por severidade, at_risk) é calculado em tempo de query filtrando `cancelled_at IS NULL AND expires_at > now()`.

**Alternativa:** coluna `score` no user, atualizada via trigger — mais complexo, mais frágil.

**Rationale:** O volume de faltas por membro é pequeno (dezenas no máximo). Cálculo dinâmico é simples e sempre consistente sem necessidade de sincronização.

**Query de summary:**
```sql
SELECT
  severity,
  COUNT(*) AS count
FROM member_violations mv
JOIN company_norms cn ON cn.id = mv.norm_id
WHERE mv.user_id = $1
  AND mv.cancelled_at IS NULL
  AND mv.expires_at > now()
GROUP BY severity
```
Score = `leves*1 + moderadas*2 + graves*6 + desligamentos*18`; `at_risk = score >= 18`.

---

### D5: GET /violations retorna violations agrupadas por membro com summary

**Decisão:** O endpoint retorna uma lista de membros visíveis ao caller, cada um com suas violations e summary. Com `?userId=` retorna apenas aquele membro.

**Visibilidade:**
- Consultor: não tem subordinados — o endpoint sem userId retorna lista vazia (redirecionar para /violations/me)
- Gerente: subordinados de mesmo setor com rank < 1
- Diretor: usa `getVisibleSectors()` para incluir VEMKTU dual-sector
- Assessor/Presidente: todos os membros

---

### D6: Normas com código textual (AN01–AN31) como campo de dados — sem active/inactive

**Decisão:** O código (ex: `AN01`) é armazenado como coluna `code TEXT UNIQUE`. A tabela `company_norms` tem apenas as colunas necessárias: `id`, `code`, `description`, `severity`, `created_at`, `updated_at`. Não há flag `active`.

**Rationale:** Normas do estatuto são referências permanentes. Adicionar `active` criaria complexidade sem benefício real — se uma norma não deve ser usada, ela pode ser deletada (hard delete) ou editada. Violations existentes mantêm o `norm_id` como FK, então `DELETE /norms/:id` retorna 409 se houver violations referenciando a norma. Todos os nomes de colunas são em inglês para garantir consistência com o restante do schema.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Falha no envio de email bloqueia criação da falta | EmailService com try/catch; erro logado mas não propagado |
| RESEND_API_KEY ausente em dev/test | EmailService retorna no-op silencioso se key ausente |
| Difícil inspecionar emails em desenvolvimento | Modo dev: `EMAIL_DEV_REDIRECT` redireciona para endereço fixo; sem a var, loga payload no console |
| Gerente de marketing não existe hoje mas VEMKTU rule existe | `getVisibleSectors()` já trata isso; nenhuma mudança necessária |
| Normas editáveis podem divergir do estatuto impresso | Responsabilidade operacional; fora do escopo técnico |
| Hard delete de norma com violations quebra FK | Service captura erro 23503 do PostgreSQL e retorna 409 antes da tentativa de delete |

## Migration Plan

1. `create-company-norms-table.sql` — cria tabela e enum `norm_severity`
2. `seed-company-norms.sql` — insere as 31 normas (AN01–AN31)
3. `create-member-violations-table.sql` — cria tabela com FK para norms e users

Rollback: migrations são reversíveis via `DROP TABLE` (nenhuma alteração em tabelas existentes).

## Open Questions

- *(resolvido)* Provider de email → Resend
- *(resolvido)* Cálculo de score → sistema de pontos (1/2/6/18)
- *(resolvido)* Cancelamento → rank(caller) > rank(applied_by) OR applied_by = caller
