## Context

O módulo `time-tracking` expõe atualmente as rotas `POST /time-tracking/clock-in`, `POST /time-tracking/clock-out` e `GET /time-tracking/summary`. O nome do recurso de banco de dados é `time_entries`, gerando inconsistência entre rota HTTP e tabela. O endpoint de summary mistura dois casos de uso distintos (próprio usuário vs. outro usuário) no mesmo path via query param `?user_id`, o que dificulta a leitura e a definição de policies por rota.

## Goals / Non-Goals

**Goals:**
- Alinhar o prefixo HTTP com o nome do recurso de banco (`time_entries` → `/time-entries`)
- Separar o endpoint de summary em duas rotas distintas: `/summary/me` (próprio usuário) e `/summary/:userId` (superusuário consultando outro usuário)
- Manter comportamento idêntico ao atual para cada cenário de uso

**Non-Goals:**
- Alterar lógica de negócio do clock-in, clock-out ou cálculo do summary
- Versionar a API ou manter retrocompatibilidade com os paths antigos
- Alterar estrutura de banco de dados ou DTOs de resposta

## Decisions

### 1. Renomear prefixo de `time-tracking` para `time-entries`

**Decisão:** Alterar o decorator `@Controller('time-tracking')` para `@Controller('time-entries')`.

**Alternativas consideradas:** Criar um alias (manter ambas as rotas) — rejeitado, pois gera ambiguidade e não há cliente externo documentado que precise de retrocompatibilidade neste estágio.

### 2. Separar summary em `/summary/me` e `/summary/:userId`

**Decisão:** Criar dois handlers no controller:
- `@Get('summary/me')` — retorna o summary do usuário autenticado, sem aceitar parâmetros de identificação
- `@Get('summary/:userId')` — aceita `userId` como path param, restrito a superusuários (rank >= 3)

**Alternativas consideradas:** Manter um único endpoint com query param — rejeitado, pois mistura concerns e dificulta a aplicação de policies granulares por rota; usar `@Get('summary')` com lógica condicional — rejeitado pela mesma razão.

**Atenção à ordem dos handlers:** `summary/me` deve ser declarado antes de `summary/:userId` no controller para que o NestJS não interprete `me` como um `userId`.

## Risks / Trade-offs

- [Breaking change] Qualquer cliente que consuma os endpoints antigos irá receber 404 após o deploy. → Mitigation: mudança coordenada; não há clientes externos documentados neste momento.
- [Ordem de rotas] Se `summary/:userId` for declarado antes de `summary/me`, o NestJS roteia `GET /time-entries/summary/me` para o handler de userId com `userId = "me"`. → Mitigation: garantir que `summary/me` aparece primeiro no controller.
