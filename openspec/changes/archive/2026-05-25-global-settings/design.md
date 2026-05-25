## Context

A API já possui infraestrutura de configuração para variáveis de ambiente (`EnvService`, Zod validation). O que está sendo adicionado é uma camada separada e complementar: **configurações de negócio** mutáveis em runtime, gerenciadas por superusuários via API, sem necessidade de novo deploy.

O padrão de acesso é assimétrico — leitura frequente (a cada request que depende de alguma config), escrita rara (superusuário ajusta um valor de tempos em tempos). O design gira em torno desse assimetria.

## Goals / Non-Goals

**Goals:**
- Tabela `app_settings` como singleton no banco (exatamente uma linha sempre)
- `SettingsService` com cache em memória, carregado no startup e atualizado a cada `PATCH`
- `GET /settings` acessível a qualquer usuário autenticado
- `PATCH /settings` restrito a superusuários (rank >= 3), com validação Zod no DTO
- Configuração inicial: `min_week_hours INT DEFAULT 40`

**Non-Goals:**
- Histórico de quem alterou o quê
- Configurações por usuário ou grupo
- TTL ou invalidação de cache por tempo
- Consumo de `min_week_hours` por outros módulos neste change

## Schema

```sql
CREATE TABLE app_settings (
  -- constraint garante que existe exatamente uma linha
  id              BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  min_week_hours  INT         NOT NULL DEFAULT 40,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed inicial: garante que a linha existe desde o deploy
INSERT INTO app_settings DEFAULT VALUES;
```

A escolha de `BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE)` é o padrão para singletons no Postgres: qualquer tentativa de inserir uma segunda linha falha na constraint da chave primária.

## Decisions

### 1. Cache em memória com hot-reload imediato no PATCH

**Decisão:** `SettingsService` carrega as settings do banco no `onModuleInit` e mantém em um campo privado. O método `get()` é síncrono e lê diretamente do cache. O método `update()` persiste no banco e atualiza o cache **na mesma operação**, de forma que qualquer chamada a `get()` subsequente ao PATCH já recebe o novo valor — sem restart, sem delay.

**Contrato para consumidores:** Módulos que dependem de settings **devem chamar `get()` no momento do uso**, nunca capturar o valor no constructor. Capturar no constructor congela o valor no tempo da inicialização e quebra o hot-reload.

```typescript
// CORRETO — lê do cache a cada uso
someMethod() {
  const min = this.settings.get('min_week_hours');
}

// ERRADO — valor congelado no startup, não recebe atualizações
constructor(private readonly settings: SettingsService) {
  this.minWeekHours = settings.get('min_week_hours');
}
```

**Alternativa descartada:** Buscar do banco a cada request. Desnecessário dado que settings mudam raramente — adiciona latência sem benefício.

**Alternativa descartada:** TTL com revalidação periódica. Adiciona complexidade sem ganho real: o PATCH já garante atualização imediata via cache. O único cenário onde TTL ajudaria seria edições diretas no banco fora da API — não é um fluxo suportado.

### 2. GET /settings acessível a todos os usuários autenticados

**Decisão:** `@RoutePolicy({ access: { mode: 'authenticated' } })` sem `rba`. Qualquer usuário autenticado pode ler as configurações globais.

**Razão:** `min_week_hours` (e futuras configs do mesmo tipo) são valores que o frontend precisa exibir para o próprio usuário — ex: "sua meta semanal é 40h". Restringir a leitura a superusuários tornaria necessária uma camada extra de repasse de informação ao cliente.

### 3. PATCH devolve o estado completo após a atualização

**Decisão:** O response do `PATCH /settings` retorna o objeto completo de settings (não apenas os campos alterados).

**Razão:** Mantém consistência com o padrão já adotado no `PATCH /users/:id`. O cliente recebe o estado canônico após a operação, sem precisar de um `GET` subsequente.

### 4. SettingsModule exporta SettingsService como global

**Decisão:** `SettingsModule` usa `@Global()` para que `SettingsService` possa ser injetado em qualquer módulo sem necessidade de importar `SettingsModule` explicitamente em cada um.

**Razão:** Settings é infraestrutura horizontal — será consumida por vários módulos ao longo do tempo. Exigir a importação explícita em cada módulo é boilerplate sem valor.

### 5. Adição de novas configs via migration — sem key-value genérico

**Decisão:** Cada nova configuração é uma nova coluna na tabela `app_settings`, adicionada via migration SQL. Não usaremos uma tabela key-value genérica.

**Razão:** Mantém a filosofia do projeto — tipos reais no banco, validação Zod no código. O custo de uma migration por nova config é baixo dado que mudanças de schema são raras e controladas.

## Response Shapes

### GET /settings — 200
```json
{
  "min_week_hours": 40
}
```

### PATCH /settings — 200
```
body: { "min_week_hours": 35 }
```
```json
{
  "min_week_hours": 35
}
```

### PATCH /settings — 400 (validação)
```json
{
  "message": { "fieldErrors": { "min_week_hours": ["Expected number, received string"] } },
  "error": "Bad Request",
  "statusCode": 400
}
```

### PATCH /settings — 403 (não-superusuário)
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Risks / Trade-offs

- **Múltiplas instâncias**: Se a API rodar com mais de uma instância, um PATCH processado por uma instância atualiza o cache dela, mas as demais ficam desatualizadas até o próximo restart. Não é um problema agora, mas precisará de invalidação via Redis ou pub/sub quando houver scale horizontal.
- **Edições diretas no banco**: Alterações feitas diretamente na tabela `app_settings` (fora da API) não são refletidas em runtime. O fluxo oficial de atualização é exclusivamente via `PATCH /settings`.
