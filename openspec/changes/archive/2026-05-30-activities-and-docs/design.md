## Context

A API usa NestJS com PostgreSQL via `pg` pool (SQL cru, sem ORM) e Supabase apenas para autenticação. A hierarquia de roles já está codificada em `src/common/guards/role-hierarchy.ts` com ranks 0–4. Controllers usam `@RoutePolicy` + `RoutePolicyGuard` para controle de acesso. A documentação atual é gerada em runtime pelo Swagger, acoplada aos decorators dos controllers.

## Goals / Non-Goals

**Goals:**
- Implementar CRUD de atividades com visibilidade baseada em role + setor
- Substituir Swagger por `API.md` estático renderizado em `/docs`
- Manter o padrão arquitetural existente (SQL cru, módulos NestJS, mesmo estilo de DTOs)

**Non-Goals:**
- Filtros de visibilidade por atividade individual (ex: compartilhar uma atividade com alguém específico)
- Notificações ou eventos ao criar/editar atividades
- Paginação na listagem de atividades

## Decisions

### 1. Tabela `activities` separada com FK para `users`

Alternativa considerada: armazenar como JSONB no perfil do usuário.

Decisão: tabela separada. O banco já é relacional (PostgreSQL), o padrão do projeto é tabelas com FK (vide `time_entries`), e a regra de visibilidade exige `JOIN` com `users` de qualquer forma. JSONB dificultaria queries cross-user.

### 2. Enum PostgreSQL para `priority`

Alternativa considerada: `TEXT` com `CHECK` constraint.

Decisão: enum `activity_priority`. Mais expressivo no schema, aparece melhor em ferramentas de banco, e enums são nativos do PostgreSQL. O custo de migration é mínimo.

### 3. Visibilidade resolvida em SQL (não em TypeScript)

A query de listagem recebe `requester_rank`, `requester_id` e `requester_sector` como parâmetros e aplica a regra via `CASE` inline. Alternativa seria buscar todos e filtrar em TS, mas isso traz dados desnecessários do banco.

```sql
WHERE (
  $1 >= 3                        -- superusuário vê tudo
  OR a.user_id = $2              -- próprias atividades
  OR (
    u.sector = $3
    AND CASE u.role
          WHEN 'consultor'  THEN 0
          WHEN 'gerente'    THEN 1
          WHEN 'diretor'    THEN 2
          WHEN 'assessor'   THEN 3
          WHEN 'presidente' THEN 4
          ELSE -1
        END < $1
  )
)
```

### 4. Filtros de data: `?date=` e `?from=`/`?to=`

`?date=` é um atalho para dia exato (sobrescreve `from`/`to` se todos fornecidos). Ambos são opcionais; sem filtro retorna todas as atividades visíveis.

### 5. Remoção do Swagger + renderização do `API.md` com `marked`

Alternativa considerada: manter Swagger e adicionar `/docs` paralelo.

Decisão: remover completamente. Swagger mantido apenas pelo benefício da UI interativa, que agora é substituída por documentação estática versionada. `marked` é leve (~50kb), sem dependências, e renderiza o markdown server-side, evitando dependência de CDN em produção.

O controller `DocsController` lê `API.md` da raiz do projeto em tempo de execução, renderiza com `marked`, e retorna HTML com estilo inline básico. Não há template engine, coerente com o estilo minimalista do projeto.

### 6. Apenas o dono pode criar, editar e deletar

A autoria é sempre `req.jwtData.sub`. Edição e deleção verificam `user_id = $requester_id` antes de agir — se não for dono, retorna 403. Isso é consistente com o padrão de `clock-in`/`clock-out` onde cada operação é sempre sobre o próprio usuário.

## Risks / Trade-offs

- **CASE hardcoded de roles no SQL**: Se um novo role for adicionado no futuro, a query de visibilidade precisa ser atualizada. → Mitigação: a função `getRank()` em `role-hierarchy.ts` já é a fonte da verdade; o CASE SQL deve espelhar o mesmo mapa.
- **Remoção do Swagger é breaking para consumidores da `/docs` atual**: A UI interativa deixa de existir. → Mitigação: `API.md` cobre todas as rotas com exemplos; o endpoint `/docs` continua servindo documentação.
- **`marked` executa no request path**: Para um `API.md` de tamanho típico (<100KB), isso é imperceptível. → Se performance for preocupação futura, o HTML renderizado pode ser cacheado em memória na inicialização.

## Migration Plan

1. Criar o enum e a tabela via migration SQL no Supabase (pode ser executado com `inactive` sem downtime)
2. Deploy da nova versão da API (inclui novo módulo `activities`, novo módulo `docs`, remoção do Swagger)
3. Rollback: reverter o deploy; dropar tabela/enum se necessário (sem dados em produção ainda)

## Open Questions

- Estilo CSS do `/docs`: HTML cru com `<pre>` ou aplicar algum tema visual básico? (assumido: estilo simples mas legível, sem dependência externa)
