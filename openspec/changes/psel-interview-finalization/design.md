## Context

O módulo `selection-process` já possui o fluxo completo de agendamento de entrevistas: declaração de slots, envio de token ao candidato, agendamento público e notificações. O que falta são as duas etapas pós-agendamento: comunicar o link da chamada e registrar a avaliação do candidato.

Ambas as rotas operam sobre um `booking_id` existente e exigem que o requisitante seja um dos dois consultores sorteados para aquela entrevista — verificado via `psel_interview_slots WHERE booking_id = X AND consultant_id = req.user`.

## Goals / Non-Goals

**Goals:**

- Consultor vinculado ao booking pode enviar link do Google Meet ao candidato por email
- O link é persistido em `psel_interview_bookings.meet_link` para rastreabilidade
- Consultor vinculado ao booking pode submeter avaliação estruturada do candidato
- A avaliação é imutável após criação (primeira submissão é definitiva)
- Ambas as rotas validam autorização por vínculo de slot, não por role

**Non-Goals:**

- Assessor/presidente não têm acesso privilegiado a essas rotas (são rotas do entrevistador, não do admin)
- Não há reenvio de link com atualização de meet_link já salvo
- Não há agregação ou consolidação de avaliações (leitura futura)
- Não há notificação ao candidato sobre a avaliação

## Decisions

### D1: Autorização por vínculo de slot, não por role

**Decisão:** Ambas as rotas aceitam `ANY_AUTH` mas validam internamente: `SELECT id FROM psel_interview_slots WHERE booking_id = $1 AND consultant_id = $2`. Se não existe linha → 403.

**Rationale:** As rotas pertencem ao fluxo do entrevistador, não da administração. Um assessor que não participou da entrevista não deveria enviar o Meet link nem avaliar o candidato. Validar pelo vínculo de slot é semanticamente correto e consistente com o modelo de dados.

**Alternativa considerada:** Usar `ADMIN_ACCESS` — descartado pois excluiria os consultores, que são os atores naturais dessas ações.

### D2: Helper privado `assertConsultantLinked(bookingId, consultantId)`

**Decisão:** Extrair a query de verificação como método privado na service, reutilizado nas duas rotas.

**Rationale:** Evita duplicação de lógica crítica de autorização. Se a query precisar mudar (ex: superuser bypass), muda em um lugar só.

### D3: `meet_link` persistido em `psel_interview_bookings`

**Decisão:** `ALTER TABLE psel_interview_bookings ADD COLUMN meet_link TEXT`.

**Rationale:** O link é atributo da entrevista — faz sentido estar no booking. Permite que o frontend exiba o link no detalhe da entrevista sem query adicional. Alternativa de tabela separada seria over-engineering para um campo simples.

**Sem reenvio com atualização:** Se `meet_link` já está preenchido, a rota retorna 409. O link é enviado uma vez; se errou, contato manual.

### D4: Validação regex do Google Meet no Zod

**Decisão:** `z.string().regex(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/)` no DTO.

**Rationale:** Evita que entrevistadores insiram URLs aleatórias. O padrão `xxx-xxxx-xxx` é o formato estável dos links do Google Meet.

### D5: Avaliação imutável via `UNIQUE(booking_id)` + sem UPDATE

**Decisão:** `psel_interview_evaluations` tem `UNIQUE(booking_id)`. A service verifica existência antes de inserir → 409 se já existe. Não há rota de UPDATE.

**Rationale:** Avaliação pós-entrevista deve ser definitiva para integridade do processo seletivo. Reavaliação poderia ser manipulada. O `UNIQUE` no banco é a guarda de segurança mesmo se a checagem da service falhar em concorrência.

### D6: Schema da avaliação — campos fixos no banco

**Decisão:** 12 colunas `SMALLINT CHECK(1–5)` para qualidades desejadas + 6 colunas `BOOLEAN` para habilidades indesejadas + `TEXT` nullable para observações.

**Rationale:** Campos fixos permitem queries analíticas no futuro (média por habilidade, distribuição de scores). JSONB seria mais flexível mas impediria `CHECK` constraints e tornaria queries mais complexas. Os critérios de avaliação são estáveis dentro de um processo seletivo.

## Risks / Trade-offs

- **[Risk]** Dois consultores da mesma dupla tentam avaliar simultaneamente — **Mitigation:** `UNIQUE(booking_id)` no banco garante que apenas um INSERT vinga; o segundo recebe violação de constraint → 409
- **[Risk]** Consultor envia meet_link errado e não há mecanismo de correção — **Aceito:** decisão explícita de imutabilidade; contato manual como fallback
- **[Trade-off]** Validação de vínculo (`assertConsultantLinked`) adiciona uma query extra por rota — **Aceito:** segurança > performance em rotas de baixa frequência

## Migration Plan

1. Deploy migration `ALTER TABLE psel_interview_bookings ADD COLUMN meet_link TEXT`
2. Deploy migration `CREATE TABLE psel_interview_evaluations`
3. Deploy do código (novas rotas no controller existente)
4. Rollback: remover a coluna e a tabela; reverter código — sem impacto nas tabelas/rotas existentes

## Schema

```sql
ALTER TABLE psel_interview_bookings
  ADD COLUMN meet_link TEXT;

CREATE TABLE psel_interview_evaluations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID        NOT NULL UNIQUE REFERENCES psel_interview_bookings(id),
  evaluator_id            UUID        NOT NULL REFERENCES users(id),

  -- Qualidades desejadas (1–5)
  proatividade            SMALLINT    NOT NULL CHECK (proatividade BETWEEN 1 AND 5),
  lideranca               SMALLINT    NOT NULL CHECK (lideranca BETWEEN 1 AND 5),
  transparencia           SMALLINT    NOT NULL CHECK (transparencia BETWEEN 1 AND 5),
  uniao_de_time           SMALLINT    NOT NULL CHECK (uniao_de_time BETWEEN 1 AND 5),
  comunicacao             SMALLINT    NOT NULL CHECK (comunicacao BETWEEN 1 AND 5),
  seriedade               SMALLINT    NOT NULL CHECK (seriedade BETWEEN 1 AND 5),
  compromisso             SMALLINT    NOT NULL CHECK (compromisso BETWEEN 1 AND 5),
  proposito               SMALLINT    NOT NULL CHECK (proposito BETWEEN 1 AND 5),
  autoresponsabilidade    SMALLINT    NOT NULL CHECK (autoresponsabilidade BETWEEN 1 AND 5),
  autoconfianca           SMALLINT    NOT NULL CHECK (autoconfianca BETWEEN 1 AND 5),
  responsabilidade_social SMALLINT    NOT NULL CHECK (responsabilidade_social BETWEEN 1 AND 5),
  criatividade            SMALLINT    NOT NULL CHECK (criatividade BETWEEN 1 AND 5),

  -- Habilidades indesejadas (true = candidato apresentou o comportamento)
  procrastinacao          BOOLEAN     NOT NULL,
  desinteresse            BOOLEAN     NOT NULL,
  falta_de_transparencia  BOOLEAN     NOT NULL,
  proposito_vago          BOOLEAN     NOT NULL,
  vitimizacao             BOOLEAN     NOT NULL,
  falta_de_confianca      BOOLEAN     NOT NULL,

  observacoes             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
```
