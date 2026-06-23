## Context

O módulo `selection-process` existe em `src/modules/selection-process/` e segue o padrão NestJS do projeto: controller com `RoutePolicyGuard`, service com SQL direto via `DatabaseService`, validação com Zod, e respostas em snake_case.

Entrevistas são conduzidas em dupla: dois consultores por candidato. Podem ocorrer em paralelo — vários candidatos sendo entrevistados simultaneamente, cada um com sua dupla de consultores.

O sistema de tokens usa `FRONTEND_URL` (env var já no schema) para compor o link enviado por email: `FRONTEND_URL/psel/entrevistas/:token`. Slots são de 1 hora exata em horários fechados de Brasília (BRT = UTC-3, sem DST desde 2019): 08h–09h, 09h–10h, …, 19h–20h.

## Goals / Non-Goals

**Goals:**

- Qualquer usuário autenticado declara disponibilidade em slots
- Candidatos veem horários agregados (sem saber quais consultores estão disponíveis)
- Horário só aparece para candidatos se ≥2 consultores livres naquele momento
- Agendamento sorteia 2 consultores aleatoriamente dentre os disponíveis
- Entrevistas paralelas: múltiplos candidatos podem ser agendados no mesmo horário (contanto que haja pares suficientes)
- Consultor vê seus próprios slots; superuser vê todos

**Non-Goals:**

- Cancelamento ou reagendamento de entrevistas
- Notificação ao consultor quando é sorteado para uma entrevista
- Interface de calendário ou integração externa
- Autenticação do candidato além do token temporário

## Decisions

### D1: Separação entre slots de disponibilidade e bookings de candidatos

**Decisão:** Duas tabelas distintas: `psel_interview_slots` (um por consultor por horário) e `psel_interview_bookings` (um por candidato).

**Rationale:** A disponibilidade do consultor e a entrevista do candidato são conceitos distintos. Misturá-los em uma tabela criaria ambiguidade: um slot "ocupado" poderia significar "consultor indisponível" ou "candidato agendado". Com tabelas separadas, o modelo é claro: slots são declarações de disponibilidade, bookings são entrevistas confirmadas.

**Alternativa considerada:** `candidate_id` e `booking_id` direto em `psel_interview_slots` — descartado porque uma entrevista vincula 2 consultores a 1 candidato, o que criaria redundância e tornaria impossível o `UNIQUE(candidate_id)` funcionar corretamente.

### D2: Vínculo booking ↔ slots via `booking_id` na tabela de slots

**Decisão:** A tabela `psel_interview_slots` tem uma coluna `booking_id` (FK para `psel_interview_bookings`, nullable). Quando o candidato agenda, os 2 slots sorteados recebem `booking_id = <novo booking>`.

**Rationale:** Permite consultar "quais consultores estão na entrevista X" via `SELECT * FROM psel_interview_slots WHERE booking_id = ?`. Também permite "quantos slots livres existem neste horário" via `COUNT(*) WHERE starts_at = ? AND booking_id IS NULL`. Os nomes dos consultores ficam acessíveis somente pelo lado autenticado.

### D3: GET público agrega por horário, não expõe slots individuais

**Decisão:** `GET /selection-process/interviews` retorna uma lista de horários disponíveis (`starts_at`, `ends_at`) — sem consultant_id, sem consultant_name, sem slot IDs.

**Rationale:** O candidato escolhe um horário, não um consultor específico. Expor consultant_name ou slot IDs na rota pública revelaria informação organizacional desnecessária e permitiria que o candidato tentasse influenciar qual consultor o entrevistaria.

### D4: PATCH recebe `starts_at` no body, sem `:slotId` na URL

**Decisão:** `PATCH /selection-process/interviews` com body `{ starts_at, token }` — sem ID de recurso na URL.

**Rationale:** O candidato está reservando um horário, não um slot específico. Não existe um ID de "horário disponível" — o horário é identificado por `starts_at`. Colocar um timestamp na URL seria URL-encoding feio e semanticamente confuso. O body é o lugar natural para o horário desejado.

### D5: Sorteio de 2 consultores com `ORDER BY RANDOM()` dentro de transaction com FOR UPDATE

**Decisão:** Dentro da transaction de booking:

1. `SELECT id FROM psel_interview_slots WHERE starts_at = $1 AND booking_id IS NULL FOR UPDATE`
2. Verificar count ≥ 2
3. Pegar os 2 primeiros de `ORDER BY RANDOM()` da lista já bloqueada
4. Criar booking → atualizar `booking_id` dos 2 slots

**Rationale:** O `FOR UPDATE` bloqueia todos os slots disponíveis naquele horário, evitando que duas transactions concorrentes sorteiem os mesmos consultores. O `ORDER BY RANDOM()` é feito em memória (ou com `TABLESAMPLE` se necessário) sobre a lista já bloqueada. Não depende de índice especial.

**Alternativa considerada:** Lock pessimista só nos 2 slots sorteados — descartado porque não garante que outro processo não tenha já tomado um dos sorteados antes do lock.

### D6: `expires_at` do token = `selection_process.ends_at`

**Decisão:** Ao gerar o token, usar o `ends_at` do processo ativo como expiração.

**Rationale:** O link só faz sentido enquanto o processo está em aberto. Evita tokens perpetuamente válidos sem job de limpeza.

### D7: Token não é one-time use

**Decisão:** PATCH valida que o token não expirou e que o candidato não tem booking — mas não invalida o token após uso.

**Rationale:** Candidato pode tentar horários que já foram tomados. Token one-time deixaria o candidato preso se o primeiro PATCH encontrasse um horário já esgotado. O controle real é `UNIQUE(candidate_id)` em `psel_interview_bookings`.

### D8: Criação de slot não exige processo ativo (consultor declara disponibilidade livremente)

**Decisão:** `POST /selection-process/interviews` vincula o slot ao processo ativo no momento da criação. Se não houver processo ativo, retorna 404.

**Rationale:** Um consultor não pode declarar disponibilidade "no vazio" — a disponibilidade é sempre dentro do contexto de um processo seletivo. Mas a associação é automática (pelo processo ativo), sem o consultor precisar informar um `selection_process_id`.

### D9: Visibilidade de slots (GET /slots)

**Decisão:** Rota `GET /selection-process/interviews/slots` — usuário autenticado vê seus próprios slots; assessor/presidente veem todos os slots de todos os consultores.

**Rationale:** O consultor precisa saber quais horários marcou e se foi sorteado para alguma entrevista (para se preparar). Superusers (assessor/presidente) precisam de visão geral operacional.

**Resposta quando booked:** Inclui `candidate_name` e `candidate_email` para que os consultores saibam quem irão entrevistar.

### D10: `ends_at` do slot computado pelo servidor

**Decisão:** Cliente envia apenas `starts_at`. Servidor calcula `ends_at = starts_at + 1 hora`.

**Rationale:** Garante invariante "todos os slots têm exatamente 1 hora" sem depender de validação client-side.

## Risks / Trade-offs

- **[Risk]** Múltiplos candidatos agendando o mesmo horário simultaneamente — **Mitigation:** `FOR UPDATE` nos slots + `UNIQUE(candidate_id)` em bookings como fallback
- **[Risk]** Horário com exatamente 2 slots livres: dois candidatos concorrem e um perde — **Mitigation:** transaction com FOR UPDATE garante que apenas 1 booking é criado; o segundo recebe 409
- **[Risk]** Processo seletivo encerrado com tokens válidos ainda sendo usados — **Mitigation:** token expira com o processo; PATCH valida expiração
- **[Trade-off]** `ORDER BY RANDOM()` não é determinístico — aceito, o requisito é sorteio aleatório

## Migration Plan

1. Deploy migration `psel_interview_bookings` (referencia selection_processes e candidates)
2. Deploy migration `psel_interview_slots` (referencia users e psel_interview_bookings)
3. Deploy migration `psel_interview_tokens` (referencia candidates)
4. Deploy do código (novas rotas adicionadas ao controller existente)
5. Rollback: remover as 3 tabelas novas e reverter código — sem impacto nas tabelas existentes

## Schema

```sql
CREATE TABLE psel_interview_bookings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  candidate_id         UUID        NOT NULL UNIQUE REFERENCES candidates(id),
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  booked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE psel_interview_slots (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  consultant_id        UUID        NOT NULL REFERENCES users(id),
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  booking_id           UUID        REFERENCES psel_interview_bookings(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (consultant_id, starts_at)
);

CREATE TABLE psel_interview_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID        NOT NULL REFERENCES candidates(id),
  token        TEXT        NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```
