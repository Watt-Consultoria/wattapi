## Context

O projeto é uma API NestJS/TypeScript usando PostgreSQL via `pg` Pool com SQL puro (sem ORM). Migrações são gerenciadas pelo Supabase CLI em `src/database/supabase/migrations/`. O módulo `leads` já existe com controller, service e DTOs via Zod. A ReceitaWS oferece `GET https://receitaws.com.br/v1/cnpj/{cnpj}` sem autenticação, limitada a 3 req/min no plano gratuito.

## Goals / Non-Goals

**Goals:**
- Expor `GET /leads/cnpj/:cnpj` (14 dígitos, sem máscara) retornando dados públicos da empresa
- Cache-aside persistente em banco: miss → chama API → salva → retorna; hit → retorna do cache direto
- Mesma política de acesso `LEADS_ACCESS` já usada nas rotas existentes de leads

**Non-Goals:**
- Expiração/TTL do cache (dados de CNPJ mudam raramente; pode ser adicionado depois)
- Rate limiting no próprio endpoint
- Retry automático em caso de falha na ReceitaWS
- Paginação ou busca por múltiplos CNPJs

## Decisions

### 1. Cache-aside em tabela PostgreSQL, não Redis

**Decisão:** Criar tabela `cnpj_cache` no banco existente, com `cnpj` TEXT PK (formato com máscara), `data JSONB` e `fetched_at TIMESTAMPTZ`.

**Por quê:** O projeto não tem Redis. O volume de CNPJs únicos por lead é baixo, e PostgreSQL com PK lookup é O(log n) — mais que suficiente. Adicionar Redis seria overhead de infra sem benefício real aqui.

**Alternativa descartada:** Cache em memória (Map no service) — não persiste entre restarts e não escala horizontalmente.

### 2. Native `fetch` para chamar a ReceitaWS

**Decisão:** Usar o `fetch` global do Node 18+ sem adicionar dependências.

**Por quê:** O projeto não tem axios nem outro cliente HTTP. `fetch` nativo já está disponível e é suficiente.

### 3. CNPJ recebido como path param em dígitos; cache usa formato com máscara

**Decisão:** `GET /leads/cnpj/12345678000195`. O service valida os 14 dígitos, converte para o formato com máscara (`12.345.678/0001-95`) para usar como chave de cache, e passa os dígitos direto para a URL da ReceitaWS.

**Por quê:** O CNPJ formatado contém `/`, que é um separador de rota — não pode ser usado como path param sem encoding especial. Dígitos no path são limpos e semânticos. A chave de cache usa o formato com máscara para consistência com o campo `cnpj` da tabela `leads`.

### 4. Validação no controller via função de dígitos

**Decisão:** Extrair uma função `isValidCnpjDigits(digits: string): boolean` em `lead.dto.ts` que valida os 14 dígitos (sem máscara). O controller valida o path param antes de qualquer I/O.

**Por quê:** Falha rápida, sem custo de I/O para entradas inválidas.

### 5. Erros da ReceitaWS propagados como 502 Bad Gateway

**Decisão:** Se a ReceitaWS retornar erro (status != 200 ou JSON com `status: "ERROR"`), o endpoint retorna HTTP 502. Não cacheamos erros.

**Por quê:** Erros podem ser temporários. Cachear um erro impediria a consulta de funcionar depois que o problema se resolver.

## Risks / Trade-offs

- **Rate limit hit em cache miss concorrente** → Se dois requests chegarem simultaneamente para o mesmo CNPJ não cacheado, ambos podem chamar a API antes de o cache ser populado. `INSERT ... ON CONFLICT DO NOTHING` evita erro de duplicata; o pior caso são 2 chamadas paralelas, aceitável.
- **Dados desatualizados indefinidamente** → Sem TTL, dados de CNPJ nunca são re-consultados. Aceitável por ora.
- **Dependência externa sem SLA** → A ReceitaWS gratuita não tem garantia de uptime.

## Migration Plan

1. Criar migration `src/database/supabase/migrations/<timestamp>_create-cnpj-cache.sql`
2. Adicionar `isValidCnpjDigits` e `formatCnpj` em `lead.dto.ts`
3. Adicionar handler `GET /leads/cnpj/:cnpj` no controller
4. Adicionar `lookupCnpj` no service
5. Rollback = drop da tabela + remover o handler do controller

## Open Questions

- Retornamos o JSON completo da ReceitaWS sem transformação → frontend filtra. Simplifica manutenção.
