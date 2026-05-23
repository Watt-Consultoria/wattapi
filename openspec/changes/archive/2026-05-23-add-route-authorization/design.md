## Context

A API usa NestJS com um `JwtGuard` existente que valida o token Supabase e popula `req.user` com o `UserResponse` completo (incluindo `role`). Não existe nenhuma camada de autorização além de autenticação. O módulo de auth já exporta `JwtGuard` e `AuthService`, e os controllers de users não usam nenhum guard atualmente.

Roles existentes: `consultor`, `gerente`, `diretor`, `assessor`, `presidente`.

## Goals / Non-Goals

**Goals:**
- Criar um sistema de autorização declarativo via decorator `@RoutePolicy` aplicado por rota
- Implementar `RoutePolicyGuard` para controle de acesso e resolução de campos editáveis
- Implementar `RoleSerializerInterceptor` para filtro de campos na saída baseado em role
- Proteger todas as rotas de `/users` com as políticas corretas

**Non-Goals:**
- Autorização em outros módulos além de `users` (por ora)
- Integração com CASL ou outra biblioteca de autorização externa
- Auditoria/logging de decisões de autorização

## Decisions

### D1 — Decorator unificado `@RoutePolicy` com três slices

O decorator carrega toda a política de uma rota em um único lugar, dividida em três slices consumidas por agentes diferentes:

```
@RoutePolicy({
  access: { mode, noSelfAccess? },      → RoutePolicyGuard
  write:  { superuser, self },           → RoutePolicyGuard → req.policy
  output: { [field]: { minRank, selfBypass } }  → RoleSerializerInterceptor
})
```

**Alternativa considerada**: decorators separados (`@AccessPolicy`, `@WritePolicy`, `@OutputPolicy`). Rejeitado porque fragmenta a leitura da política de uma rota — é mais difícil entender o comportamento completo de uma rota num relance.

### D2 — Modos de acesso declarativos em vez de lógica inline

A slice `access` usa modos nomeados:

| Modo | Comportamento |
|------|--------------|
| `authenticated` | Qualquer usuário autenticado |
| `min-rank` | Apenas usuários com `rank(caller) >= minRank`; `minRank` é obrigatório neste modo |
| `superuser-or-self` | rank >= 3 pode editar qualquer target de rank menor; regular só edita a si mesmo |
| `superuser-only` | Apenas rank >= 3; `noSelfAccess: true` proíbe também self-action |

**Alternativa considerada**: lógica de acesso diretamente no controller. Rejeitado porque mistura concerns e duplica lógica entre rotas.

### D3 — Hierarquia como mapa ordinal

```typescript
const ROLE_RANK: Record<string, number> = {
  consultor:  0,
  gerente:    1,
  diretor:    2,
  assessor:   3,
  presidente: 4,
};
```

A comparação `rank(caller) > rank(target)` resolve todas as regras de "pode editar outro":
- `presidente(4) > assessor(3)` → ✓
- `assessor(3) > presidente(4)` → ✗
- `assessor(3) > diretor(2)` → ✓

Superuser é definido como `rank >= 3`.

### D4 — Guard injeta `req.policy` resolvido

O `RoutePolicyGuard` não apenas decide acesso (booleano) — ele também resolve quais campos o caller pode escrever e injeta no request:

```typescript
req.policy = {
  canAccess: true,
  writableFields: ['name', 'cpf'],  // já calculado para o caller específico
}
```

O controller consome `req.policy.writableFields` para construir o schema Zod de validação dinamicamente, sem precisar conhecer as regras de role.

**Alternativa considerada**: controller verificar role diretamente. Rejeitado porque duplica a lógica de hierarquia fora do guard.

### D5 — Interceptor detecta "self" pelo objeto de resposta

Para o `selfBypass` no `RoleSerializerInterceptor`, a detecção de self usa o `id` do objeto retornado comparado ao `req.user.id`:

- Resposta é array → sem selfBypass (contexto de lista, sem dono singular)
- Resposta é objeto com `id` → compara `response.id === req.user.id`

Isso evita que o interceptor precise ler params da rota, mantendo-o desacoplado da estrutura das URLs.

### D6 — Localização dos novos arquivos em `auth/`

Os novos arquivos ficam dentro de `src/modules/auth/` por coesão — são infraestrutura de autenticação/autorização, não lógica de negócio de users:

```
src/modules/auth/
  decorators/
    current-user.decorator.ts   (existente)
    route-policy.decorator.ts   (novo)
  route-policy.guard.ts         (novo)
  role-serializer.interceptor.ts (novo)
```

## Risks / Trade-offs

- **Lógica de acesso no guard acessa o banco**: o guard precisa carregar o usuário-alvo para comparar ranks no `superuser-or-self`. Isso adiciona uma query por request protegido. Mitigação: a query é simples (SELECT por ID) e já existe em `UsersService.findOne`.

- **Schema Zod dinâmico no controller**: construir o schema a partir de `req.policy.writableFields` requer um `pick` dinâmico sobre o `updateUserSchema` completo. Zod suporta isso nativamente via `.pick()`, mas exige atenção ao tipagem TypeScript.

- **Interceptor global vs. scoped**: registrar o `RoleSerializerInterceptor` globalmente simplifica setup mas aplica a lógica de serialização a todas as rotas. Rotas sem `@RoutePolicy` teriam o interceptor executando com policy `undefined` — o interceptor deve tratar isso como "sem restrições" e passar a resposta intacta.

## Migration Plan

1. Criar os novos arquivos sem alterar rotas existentes
2. Registrar guard e interceptor no `AuthModule`
3. Aplicar `@RoutePolicy` nas rotas de users uma a uma, testando cada uma antes de avançar
4. Não há mudanças de schema de banco — rollback é simplesmente remover os decorators

## Open Questions

- O campo `email` deve ser editável por superusers via PATCH? (assumido `sim` neste design)
- Quando um usuário faz `POST /users` criando a si mesmo, a resposta deve incluir `cpf`? (assumido `sim` — é criação do próprio recurso, equivalente a self-access)
