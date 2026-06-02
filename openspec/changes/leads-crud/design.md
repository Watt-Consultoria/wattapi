## Context

O sistema tem um guard declarativo (`RoutePolicyGuard`) com condições RBA que avaliam acesso por rank, setor e identidade. Não existe nenhuma abstração para CRM — leads são um módulo completamente novo. O banco usa PostgreSQL via `pg` pool com queries raw SQL e transações gerenciadas pelo `DatabaseService`.

## Goals / Non-Goals

**Goals:**
- Introduzir CRUD completo de leads para o time comercial
- Permitir gerenciamento de portfólio de serviços da empresa (tabela dinâmica)
- Estender o sistema RBA com condição `roleAndSector` para uso atual e futuro
- Manter o padrão declarativo de políticas no decorador `@RoutePolicy`

**Non-Goals:**
- Pipeline de vendas com stages/kanban (pode vir depois)
- Integração com email ou CRM externo
- Atribuição de lead a um responsável específico (além do criador)
- Paginação na listagem de leads (pode vir depois)

## Decisions

### 1. Nova condição RBA: `['roleAndSector', { roles, sectors }]`

**Decisão**: Estender `RbaCondition` com `['roleAndSector', { roles: string[], sectors: string[] }]` avaliada como `roles.includes(caller.role) AND sectors.includes(caller.sector)`.

**Alternativas consideradas**:
- Condição nomeada `'vemktu'` — hardcoded, não reutilizável fora do contexto comercial
- Verificação no service — lógica de acesso espalhada, quebra o padrão declarativo do sistema

**Rationale**: `roleAndSector` é genérico e reutilizável. O guard permanece como ponto único de controle de acesso.

**Uso nos leads** (acesso para: todos do comercial + diretor de marketing + superuser):
```typescript
rba: [
  ['minRank', 3],
  ['sector', 'comercial'],
  ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }],
]
```

### 2. Endereço como colunas separadas

**Decisão**: 7 colunas prefixadas com `address_` na tabela `leads` (logradouro, numero, complemento, bairro, cidade, estado, cep).

**Alternativa considerada**: JSONB `address` — mais flexível, mas sem indexação direta por sub-campo.

**Rationale**: Filtragem futura por cidade/estado (prospecção regional) requer colunas separadas. Prefixo `address_` agrupa semanticamente sem precisar de tabela auxiliar para um 1:1 garantido.

### 3. Contatos como sub-resource com merge individual

**Decisão**: Endpoints `/leads/:id/contacts` com POST (adicionar), PATCH `/:contact_id` (editar) e DELETE `/:contact_id` (remover).

**Alternativa considerada**: Array embedded no body do PATCH do lead com replace total — simples, mas perde IDs individuais e exige que o cliente envie todos os contatos sempre.

**Rationale**: Contatos mudam de forma independente do lead principal. Sub-resource com IDs estáveis permite edição atômica de um contato sem risco de sobrescrever outro.

### 4. Constraint email OR phone no banco

**Decisão**: `CHECK (email IS NOT NULL OR phone IS NOT NULL)` na tabela `lead_contacts`.

**Rationale**: A regra de negócio é invariante — um contato sem nenhum meio de contato não tem utilidade. Constraint no banco garante a invariante mesmo via acesso direto ao DB.

### 5. Serviços de interesse como `TEXT[]` com validação no service

**Decisão**: Coluna `interest_items TEXT[]` diretamente na tabela `leads`. Sem junction table. Na criação e atualização de um lead, o service verifica que cada item do array existe em `portfolio_items.name`. Após salvo, o dado é histórico e independente do portfólio — se um item for excluído ou renomeado, o texto no lead permanece intacto.

**Alternativas consideradas**:
- Junction table `lead_portfolio_interests` com FK — mantém integridade referencial mas impede excluir itens do portfólio sem limpar leads, além de exigir tabela extra para dado essencialmente histórico
- `UUID[]` com FK de array — não suportado pelo PostgreSQL; UUIDs também perderiam o nome se o item fosse deletado

**Rationale**: O dado de interesse no lead é um snapshot do momento do cadastro, não uma referência viva ao portfólio. `TEXT[]` armazena o nome exato, preservando o histórico sem nenhum acoplamento estrutural. A validação no service garante consistência no momento da escrita sem precisar de FK.

### 6. Permissão de comentários no service layer

**Decisão**: Edição de comentário verificada no service (`caller.id === comment.user_id`). Deleção verificada como `caller.id === comment.user_id OR getRank(caller.role) > getRank(comment_creator.role)`.

**Rationale**: Essas regras exigem o rank do criador do comentário, obtido por JOIN. O guard opera antes do ID do comentário ser resolvido — não tem como encapsular no decorador sem uma query extra no guard. O service já tem acesso ao DB e resolve naturalmente.

### 7. Dois módulos NestJS independentes

**Decisão**: `PortfolioModule` e `LeadsModule` separados. `LeadsModule` importa `PortfolioModule` (ou o `DatabaseModule`) mas não vice-versa.

**Rationale**: Portfolio pode ser consumido futuramente por outros contextos além de leads. Manter separado evita acoplamento desnecessário.

## Risks / Trade-offs

- **Listagem sem paginação** → Para volumes pequenos (time comercial interno) é aceitável. Adicionar `LIMIT/OFFSET` ou cursor later sem breaking change.
- **Endereço sem validação de CEP** → O sistema aceita qualquer string como CEP. Validação de formato pode ser adicionada no Zod schema sem migração.
- **Rank do criador do comentário via JOIN extra no delete** → Uma query adicional por deleção de comentário. Volume baixo, não é problema.

## Migration Plan

1. Criar migration SQL com as 4 novas tabelas em ordem de dependência: `portfolio_items` → `leads` → `lead_contacts`, `lead_comments`
2. Sem rollback automático — DROP TABLE em reverso se necessário
3. Sem dados a migrar (tabelas novas)
4. Sem breaking changes na API existente (rotas novas, guard só recebe novo tipo de condição)
