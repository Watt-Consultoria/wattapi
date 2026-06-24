# WattAPI — Documentação

> Todas as rotas autenticadas exigem o header `Authorization: Bearer <token>`.

## Hierarquia de Roles

| Role | Rank |
|------|------|
| `consultor` | 0 |
| `gerente` | 1 |
| `diretor` | 2 |
| `assessor` | 3 |
| `presidente` | 4 |

**Superusuário** = rank ≥ 3 (`assessor` ou `presidente`).

---

## Índice

- [Auth](#auth)
- [Users](#users)
- [Settings](#settings)
- [Time Entries](#time-entries)
- [Activities](#activities)
- [Notifications](#notifications)
- [Push Subscriptions](#push-subscriptions)
- [Status](#status)
- [Routine](#routine)
- [Reimbursements](#reimbursements)
- [Portfolio](#portfolio)
- [Leads](#leads)
- [Norms](#norms)
- [Violations](#violations)
- [Internal Jobs](#internal-jobs)
- [Houses](#houses)
- [Gamification](#gamification)
- [Processo Seletivo](#processo-seletivo)

---

## Auth

### `GET /auth/me`

Retorna o perfil do usuário autenticado.

**Auth:** Obrigatória

**Resposta 200**

```json
{
  "id": "uuid",
  "email": "joao@empresa.com",
  "name": "João Silva",
  "role": "consultor",
  "sector": "projetos",
  "cpf": "123.456.789-09",
  "created_at": "2026-01-15T10:00:00.000Z",
  "updated_at": "2026-05-20T14:30:00.000Z"
}
```

> O campo `cpf` é omitido para usuários com rank < 2, exceto quando o token pertence ao próprio usuário.

**Respostas**
- `200` — Perfil do usuário autenticado
- `401` — Token ausente, inválido ou expirado

---

## Users

**Shape de usuário** (retornado por todas as rotas deste módulo):

```json
{
  "id": "uuid",
  "email": "joao@empresa.com",
  "name": "João Silva",
  "role": "consultor",
  "sector": "projetos",
  "cpf": "123.456.789-09",
  "created_at": "...",
  "updated_at": "..."
}
```

> `cpf` é omitido para usuários com rank < 2, exceto quando consultando o próprio perfil.

---

### `POST /users`

Cria o perfil de um usuário que já existe no Supabase Auth mas não possui cadastro no sistema. O role é definido automaticamente como `consultor`.

**Auth:** Obrigatória — JWT de usuário **sem** perfil cadastrado

**Body**

```json
{
  "name": "João Silva",
  "sector": "projetos",
  "cpf": "12345678901"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Mínimo 1 caractere |
| `sector` | enum | Sim | `projetos`, `comercial`, `marketing`, `executivo`, `institucional` |
| `cpf` | string | Sim | 11 dígitos ou formato `000.000.000-00` |

**Respostas**
- `201` — Perfil criado (shape de usuário)
- `400` — Campos inválidos ou ausentes
- `401` — Token ausente ou inválido
- `409` — Usuário já cadastrado, ou CPF/e-mail duplicado

---

### `GET /users`

Lista todos os usuários ativos, ordenados por data de criação.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de usuários
- `401` — Token ausente ou inválido

---

### `GET /users/:user_id`

Retorna um usuário específico pelo UUID.

**Auth:** Obrigatória

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | ID do usuário |

**Respostas**
- `200` — Objeto de usuário
- `401` — Token ausente ou inválido
- `404` — Usuário não encontrado

---

### `PATCH /users/:user_id`

Atualiza dados de um usuário. Campos editáveis variam conforme o nível de permissão do caller.

**Auth:** Obrigatória — próprio usuário ou rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | ID do usuário |

**Body** — Pelo menos um campo obrigatório

```json
{
  "email": "novo@empresa.com",
  "name": "Novo Nome",
  "role": "gerente",
  "sector": "comercial",
  "cpf": "98765432100"
}
```

| Campo | Acessível por |
|-------|---------------|
| `name`, `cpf` | Próprio usuário ou rank ≥ 3 |
| `email`, `role`, `sector` | Apenas rank ≥ 3 |

**Respostas**
- `200` — Usuário atualizado
- `400` — Campos inválidos ou body vazio
- `401` — Token ausente ou inválido
- `403` — Sem permissão para editar este usuário ou campo
- `404` — Usuário não encontrado
- `409` — E-mail ou CPF já em uso

---

### `DELETE /users/:user_id`

Realiza soft delete de um usuário (marca como inativo).

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | ID do usuário |

**Respostas**
- `204` — Usuário desativado
- `401` — Token ausente ou inválido
- `403` — Requer rank ≥ 3
- `404` — Usuário não encontrado

---

## Settings

### `GET /settings`

Retorna as configurações globais da aplicação.

**Auth:** Obrigatória

**Resposta 200**

```json
{
  "min_week_hours": 40,
  "min_availability_hours": 0
}
```

**Respostas**
- `200` — Configurações atuais
- `401` — Token ausente ou inválido

---

### `PATCH /settings`

Atualiza as configurações globais.

**Auth:** Obrigatória — rank ≥ 3

**Body** — Pelo menos um campo obrigatório

```json
{
  "min_week_hours": 44,
  "min_availability_hours": 10
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `min_week_hours` | inteiro positivo | Mínimo de horas semanais exigidas no registro de horas |
| `min_availability_hours` | inteiro 0–98 | Mínimo de slots em `PUT /routine`. `0` = desabilitado |

**Respostas**
- `200` — Configurações atualizadas
- `400` — Campos inválidos ou body vazio
- `401` — Token ausente ou inválido
- `403` — Requer rank ≥ 3

---

## Time Entries

### `GET /time-entries`

Retorna o resumo semanal de horas de todos os membros ativos.

**Auth:** Obrigatória — rank ≥ 3

**Query params**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `week` | inteiro ≥ 0 | `0` | Offset de semana (0 = atual, 1 = anterior, …) |

**Resposta 200**

```json
{
  "week_start": "2026-05-19",
  "week_end": "2026-05-25",
  "min_week_hours": 40,
  "members": [
    {
      "user_id": "uuid",
      "name": "João Silva",
      "total_minutes": 480,
      "min_hours_met": true
    }
  ]
}
```

**Respostas**
- `200` — Resumo semanal
- `400` — Parâmetro `week` inválido
- `401` — Token ausente ou inválido
- `403` — Requer rank ≥ 3

---

### `POST /time-entries/clock-in`

Inicia uma nova sessão de trabalho para o usuário autenticado.

**Auth:** Obrigatória

**Resposta 201**

```json
{
  "id": "uuid",
  "clocked_in_at": "2026-05-25T14:30:00.000Z"
}
```

**Respostas**
- `201` — Sessão iniciada
- `401` — Token ausente ou inválido
- `409` — Já existe uma sessão aberta

---

### `POST /time-entries/clock-out`

Encerra a sessão aberta. Sessões com mais de 480 minutos (8h) são marcadas como anuladas.

**Auth:** Obrigatória

**Resposta 200 — sessão válida**

```json
{
  "status": "valid",
  "id": "uuid",
  "clocked_in_at": "2026-05-25T14:30:00.000Z",
  "clocked_out_at": "2026-05-25T22:30:00.000Z",
  "duration_minutes": 480
}
```

**Resposta 200 — sessão anulada**

```json
{
  "status": "annulled",
  "reason": "exceeded_max_duration",
  "id": "uuid",
  "clocked_in_at": "2026-05-25T14:30:00.000Z",
  "clocked_out_at": "2026-05-26T01:30:00.000Z",
  "duration_minutes": 660
}
```

**Respostas**
- `200` — Sessão encerrada (`status: valid` ou `status: annulled`)
- `401` — Token ausente ou inválido
- `409` — Nenhuma sessão aberta

---

### `GET /time-entries/summary/me`

Retorna o resumo de horas da semana atual do usuário autenticado.

**Auth:** Obrigatória

**Resposta 200**

```json
{
  "week_start": "2026-05-19",
  "week_end": "2026-05-25",
  "total_minutes": 960,
  "min_hours_met": false,
  "valid_sessions": [
    {
      "id": "uuid",
      "clocked_in_at": "2026-05-19T09:00:00.000Z",
      "clocked_out_at": "2026-05-19T17:00:00.000Z",
      "duration_minutes": 480
    }
  ],
  "current_session": { "status": "none" }
}
```

`current_session` pode ser:
- `{ "status": "none" }` — sem sessão aberta
- `{ "status": "open", "clocked_in_at": "...", "elapsed_minutes": 120 }` — em andamento
- `{ "status": "invalid", "reason": "exceeded_max_duration", "clocked_in_at": "...", "elapsed_minutes": 510 }` — excedeu 8h

**Respostas**
- `200` — Resumo da semana atual
- `401` — Token ausente ou inválido

---

### `GET /time-entries/summary/:userId`

Retorna o resumo semanal de um usuário específico. Mesmo shape de `GET /time-entries/summary/me`.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `userId` | UUID | ID do usuário alvo |

**Respostas**
- `200` — Resumo semanal do usuário
- `401` — Token ausente ou inválido
- `403` — Requer rank ≥ 3

---

## Activities

**Shape de atividade:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "user_name": "João Silva",
  "name": "Reunião de alinhamento",
  "description": "Alinhamento semanal do time",
  "date": "2026-05-29",
  "time_start": "09:00",
  "time_end": "10:00",
  "priority": "alta",
  "created_at": "...",
  "updated_at": "..."
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `priority` | enum | `alta`, `media`, `baixa` |
| `date` | string | `YYYY-MM-DD` |
| `time_start`, `time_end` | string | `HH:MM` — `time_end` deve ser após `time_start` |

---

### `POST /activities`

Cria uma nova atividade para o usuário autenticado.

**Auth:** Obrigatória

**Body**

```json
{
  "name": "Prova de Sistemas Digitais",
  "description": "Prova da Segunda Unidade",
  "date": "2026-05-29",
  "time_start": "09:00",
  "time_end": "10:00",
  "priority": "alta"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Mínimo 1 caractere |
| `description` | string | Não | Descrição livre |
| `date` | string | Sim | `YYYY-MM-DD` |
| `time_start` | string | Sim | `HH:MM` |
| `time_end` | string | Sim | `HH:MM`, deve ser após `time_start` |
| `priority` | enum | Sim | `alta`, `media`, `baixa` |

**Respostas**
- `201` — Atividade criada
- `400` — Campos inválidos, ausentes ou `time_end ≤ time_start`
- `401` — Token ausente ou inválido

---

### `GET /activities`

Lista atividades visíveis ao usuário autenticado, com filtros opcionais de data.

**Auth:** Obrigatória

**Regras de visibilidade:**

| Role | Vê atividades de |
|------|-----------------|
| `consultor` | Apenas as próprias |
| `gerente` | Próprias + consultores do mesmo setor |
| `diretor` | Próprias + gerentes e consultores do mesmo setor |
| `assessor` / `presidente` | Todos os usuários |

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | Filtra por usuário — regras de visibilidade ainda se aplicam |
| `date` | `YYYY-MM-DD` | Dia exato — sobrescreve `from`/`to` |
| `from` | `YYYY-MM-DD` | Início do intervalo (inclusive) |
| `to` | `YYYY-MM-DD` | Fim do intervalo (inclusive) |

> Sem parâmetros, retorna todas as atividades visíveis. `date` tem precedência sobre `from`/`to`. `?id=` não bypassa visibilidade — retorna array vazio se o alvo não estiver no escopo do caller.

**Respostas**
- `200` — Array de atividades ordenado por `date DESC, time_start ASC`
- `401` — Token ausente ou inválido

---

### `GET /activities/me`

Retorna apenas as atividades do próprio usuário autenticado. Equivale a `GET /activities?id=<own_id>`, independente de visibilidade.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `date` | `YYYY-MM-DD` | Dia exato — sobrescreve `from`/`to` |
| `from` | `YYYY-MM-DD` | Início do intervalo (inclusive) |
| `to` | `YYYY-MM-DD` | Fim do intervalo (inclusive) |

**Respostas**
- `200` — Array das próprias atividades ordenado por `date DESC, time_start ASC`
- `401` — Token ausente ou inválido

---

### `PATCH /activities/:id`

Atualiza uma atividade. Apenas o dono pode editar.

**Auth:** Obrigatória — dono da atividade

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da atividade |

**Body** — Pelo menos um campo obrigatório

```json
{
  "name": "Novo nome",
  "description": "Nova descrição",
  "date": "2026-06-01",
  "time_start": "10:00",
  "time_end": "11:30",
  "priority": "media"
}
```

**Respostas**
- `200` — Atividade atualizada
- `400` — Campos inválidos ou body vazio
- `401` — Token ausente ou inválido
- `403` — Usuário não é o dono da atividade
- `404` — Atividade não encontrada

---

### `DELETE /activities/:id`

Remove permanentemente uma atividade. Apenas o dono pode deletar.

**Auth:** Obrigatória — dono da atividade

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da atividade |

**Respostas**
- `204` — Atividade removida
- `401` — Token ausente ou inválido
- `403` — Usuário não é o dono da atividade
- `404` — Atividade não encontrada

---

## Notifications

A deleção é soft delete — notificações deletadas não aparecem na listagem mas permanecem no banco.

**Shape de notificação:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Atividade agendada para hoje: Reunião de alinhamento",
  "description": "Alinhamento semanal do time",
  "origin": "automatic",
  "sent_at": "2026-05-30T03:00:00.000Z",
  "created_by": null,
  "created_at": "..."
}
```

| Campo | Valores | Descrição |
|-------|---------|-----------|
| `origin` | `automatic`, `directed` | Origem da notificação |
| `created_by` | UUID ou `null` | ID do superusuário criador; `null` se automática |

---

### `GET /notifications`

Lista todas as notificações não deletadas do usuário autenticado, ordenadas por `sent_at DESC`.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de notificações
- `401` — Token ausente ou inválido

---

### `POST /notifications`

Cria notificações dirigidas para um grupo de usuários. Target vazio (`{}`) envia para todos os usuários ativos.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{
  "title": "Aviso importante",
  "description": "Texto opcional da notificação",
  "target": {
    "sector": "comercial",
    "role": "diretor"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | string | Sim | Mínimo 1 caractere |
| `description` | string | Não | Texto livre |
| `target` | objeto | Sim | Filtro de destinatários |
| `target.sector` | string | Não | Filtra por setor |
| `target.role` | enum | Não | `consultor`, `gerente`, `diretor`, `assessor`, `presidente` |

**Lógica de `target`:**

| target | Destinatários |
|--------|---------------|
| `{}` | Todos os usuários ativos |
| `{ sector: "comercial" }` | Todos os ativos do setor comercial |
| `{ role: "diretor" }` | Todos os diretores ativos |
| `{ sector: "comercial", role: "diretor" }` | Diretor(es) do setor comercial |

**Resposta 201**

```json
{ "count": 5 }
```

**Respostas**
- `201` — Notificações criadas; `count` = número de destinatários
- `400` — Campos inválidos ou `title` ausente
- `401` — Token ausente ou inválido
- `403` — Requer rank ≥ 3

---

### `DELETE /notifications/:id`

Soft delete de uma notificação. Apenas o dono pode deletar.

**Auth:** Obrigatória — dono da notificação

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da notificação |

**Respostas**
- `204` — Notificação deletada
- `401` — Token ausente ou inválido
- `403` — Usuário não é o dono da notificação
- `404` — Notificação não encontrada ou já deletada

---

## Push Subscriptions

### `GET /push-subscriptions/vapid-public-key`

Retorna a chave pública VAPID para a PWA registrar a subscrição no browser via `PushManager.subscribe()`.

**Auth:** Pública

**Resposta 200**

```json
{ "vapid_public_key": "BLjCDzqsWtu..." }
```

---

### `POST /push-subscriptions`

Registra a subscrição Web Push do dispositivo atual para o usuário autenticado.

**Auth:** Obrigatória

**Body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML",
  "auth": "tBHItJI5svbpez7KI4CCXg"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `endpoint` | string | Sim | URL do push service do browser |
| `p256dh` | string | Sim | Chave pública do cliente (base64url) |
| `auth` | string | Sim | Segredo de autenticação do cliente (base64) |

**Respostas**
- `201` — `{ "id": "uuid" }`
- `400` — Campos obrigatórios ausentes
- `401` — Token ausente ou inválido
- `409` — Endpoint já registrado e ativo para este usuário

---

### `DELETE /push-subscriptions/:id`

Remove (soft delete) uma subscrição. Apenas o dono pode remover.

**Auth:** Obrigatória — dono da subscrição

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da subscrição |

**Respostas**
- `204` — Subscrição removida
- `401` — Token ausente ou inválido
- `403` — Usuário não é o dono da subscrição
- `404` — Subscrição não encontrada ou já removida

---

## Status

### `GET /status`

Health check da API.

**Auth:** Pública

**Resposta 200**

```json
{
  "updated_at": "2026-05-25T12:00:00.000Z",
  "dependencies": {
    "database": {
      "max_connections": 100,
      "opened_connections": 3
    }
  }
}
```

**Respostas**
- `200` — API operacional
- `500` — Erro interno no servidor

---

## Routine

A rotina é composta por slots de 1 hora, de segunda a domingo, das 08h às 22h (14 slots × 7 dias = 98 slots por usuário).

---

### `PUT /routine`

Salva ou substitui a rotina semanal do usuário autenticado. Operação de upsert atômico — todos os slots anteriores são apagados e substituídos pelos novos.

**Auth:** Obrigatória

**Body**

```json
{
  "slots": {
    "mon": [true, false, true, false, false, false, false, false, false, false, false, false, false, false],
    "tue": [...],
    "wed": [...],
    "thu": [...],
    "fri": [...],
    "sat": [...],
    "sun": [...]
  }
}
```

Cada array possui exatamente 14 booleanos: índice 0 = slot 08h–09h, índice 13 = slot 21h–22h.

**Respostas**
- `200` — Rotina salva (sem corpo)
- `400` — Payload inválido (dia faltando ou array com tamanho ≠ 14), ou total de slots abaixo de `min_availability_hours`

> Mensagem quando `min_availability_hours` falha: `"Disponibilidade insuficiente: você configurou Xh de disponibilidade, mas o mínimo exigido é Yh. Adicione mais Zh de disponibilidade."`

- `401` — Token ausente ou inválido

---

### `GET /routine`

Retorna a rotina semanal do usuário autenticado.

**Auth:** Obrigatória

**Resposta 200**

```json
{ "slots": { "mon": [bool×14], "tue": [...], "wed": [...], "thu": [...], "fri": [...], "sat": [...], "sun": [...] } }
```

Retorna `{ "slots": null }` se o usuário nunca configurou sua rotina.

**Respostas**
- `200` — Rotina do usuário (`null` se não configurada)
- `401` — Token ausente ou inválido

---

### `GET /routine/summary`

Retorna a disponibilidade agregada dos subordinados do caller e a lista dos que ainda não configuraram rotina.

**Auth:** Obrigatória — rank ≥ 1

**Visibilidade por role:**

| Caller | Subordinados visíveis | Restrição de setor |
|--------|-----------------------|-------------------|
| `gerente` | `consultor` | Mesmo setor |
| `diretor` | `gerente`, `consultor` | Mesmo setor |
| `assessor` / `presidente` | `diretor`, `gerente`, `consultor` | Nenhuma |

**Resposta 200**

```json
{
  "availability": {
    "mon": {
      "8": [{ "id": "uuid", "name": "Ana", "role": "consultor", "sector": "projetos" }],
      "14": [{ "id": "uuid", "name": "Ana", "role": "consultor", "sector": "projetos" }]
    }
  },
  "unconfigured": [
    { "id": "uuid", "name": "Carlos", "role": "gerente", "sector": "projetos" }
  ]
}
```

- `availability` — objeto aninhado por dia (`mon`–`sun`) e hora (`"8"`–`"21"`). Dias e horas sem nenhum subordinado disponível são omitidos.
- `unconfigured` — subordinados que nunca configuraram rotina, ordenados por nome.
- Retorna `{ "availability": {}, "unconfigured": [] }` quando o caller não possui subordinados visíveis.

**Respostas**
- `200` — Resumo de disponibilidade dos subordinados
- `401` — Token ausente ou inválido
- `403` — Caller é consultor (rank < 1)

---

### `GET /routine/:userId`

Retorna a rotina semanal de outro usuário, sujeito a visibilidade hierárquica.

**Auth:** Obrigatória — visibilidade verificada no serviço

Regras de acesso:
- `viewer.id === userId` → autorizado
- `rank(viewer) > rank(target)` e `rank(viewer) ≥ 3` → autorizado (qualquer setor)
- `rank(viewer) > rank(target)` e `viewer.sector === target.sector` → autorizado

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `userId` | UUID | ID do usuário alvo |

**Respostas**
- `200` — `{ "slots": {...} }` ou `{ "slots": null }` se não configurada
- `401` — Token ausente ou inválido
- `403` — Sem permissão para visualizar a rotina do alvo
- `404` — Usuário não encontrado

---

## Reimbursements

O frontend deve fazer upload dos comprovantes ao bucket `reimbursement-receipts` antes de chamar as rotas de criação.

**Shape de reembolso:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Ingresso DevConf 2026",
  "description": "Participação em conferência de desenvolvimento",
  "amount_cents": 15000,
  "category": "ingresso",
  "pix_key": "joao@empresa.com",
  "status": "pending",
  "attachments": [
    { "id": "uuid", "name": "nota.pdf", "signed_url": "https://..." }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

> `signed_url` dos attachments tem validade de 1 hora. O `path` de storage não é exposto.

---

### `POST /reimbursements`

Cria uma nova solicitação de reembolso.

**Auth:** Obrigatória

**Body**

```json
{
  "title": "Ingresso DevConf 2026",
  "description": "Participação em conferência de desenvolvimento",
  "amount_cents": 15000,
  "category": "ingresso",
  "pix_key": "joao@empresa.com",
  "attachments": [
    { "path": "receipts/user-uuid/some-uuid/nota.pdf", "name": "nota.pdf" }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | string | Sim | Mínimo 1 caractere |
| `description` | string | Sim | Mínimo 1 caractere |
| `amount_cents` | integer | Sim | Valor em centavos, deve ser positivo |
| `category` | enum | Sim | `ingresso`, `alimentação`, `transporte`, `equipamento`, `outro` |
| `pix_key` | string | Sim | Chave PIX para recebimento |
| `attachments` | array | Sim | Mínimo 1 item; cada `path` deve existir no bucket `reimbursement-receipts` |

**Respostas**
- `201` — Reembolso criado (shape de reembolso)
- `400` — Campos inválidos, `amount_cents ≤ 0`, `attachments` vazio, ou path não encontrado no storage
- `401` — Token ausente, inválido ou expirado

---

### `GET /reimbursements`

Lista solicitações de reembolso.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `target` | `me` \| `all` | `me` | `all` requer rank ≥ 3 |

**Respostas**
- `200` — Array de reembolsos (shape de reembolso)
- `401` — Token ausente, inválido ou expirado
- `403` — `target=all` por usuário com rank < 3

---

### `GET /reimbursements/:user_id`

Retorna todas as solicitações de um usuário específico. Exclusivo para superusuários.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | ID do usuário alvo |

**Respostas**
- `200` — Array de reembolsos; retorna `[]` se o usuário não tiver reembolsos
- `401` — Token ausente, inválido ou expirado
- `403` — Requer rank ≥ 3

---

### `PATCH /reimbursements/:id/status`

Aprova ou rejeita uma solicitação pendente. Status é one-way: uma vez resolvido, não pode ser alterado.

**Auth:** Obrigatória — rank ≥ 4 (`presidente`)

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do reembolso |

**Body**

```json
{ "status": "approved" }
```

| Campo | Valores |
|-------|---------|
| `status` | `approved`, `rejected` (`pending` não é permitido) |

**Respostas**
- `200` — Reembolso atualizado (shape de reembolso)
- `400` — `status` inválido, ou reembolso já resolvido
- `401` — Token ausente, inválido ou expirado
- `403` — Requer rank ≥ 4
- `404` — Reembolso não encontrado

---

## Portfolio

### `GET /portfolio`

Lista todos os itens do portfólio, ordenados por `name`.

**Auth:** Obrigatória

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "name": "Consultoria Energética",
    "description": "Análise de consumo energético",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**Respostas**
- `200` — Array de itens
- `401` — Token ausente, inválido ou expirado

---

### `POST /portfolio`

Cria um novo item de portfólio.

**Auth:** Obrigatória — rank ≥ 2

**Body**

```json
{ "name": "Auditoria Elétrica", "description": "Verificação de instalações" }
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Deve ser único |
| `description` | string | Não | |

**Respostas**
- `201` — Item criado
- `400` — `name` ausente
- `401` — Token ausente
- `403` — Rank insuficiente (< 2)
- `409` — `name` já existente

---

### `PATCH /portfolio/:id`

Atualiza parcialmente um item de portfólio.

**Auth:** Obrigatória — rank ≥ 2

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do item |

**Body** — Pelo menos um campo: `name`, `description`

**Respostas**
- `200` — Item atualizado
- `400` — Body vazio
- `401` — Token ausente
- `403` — Rank insuficiente
- `404` — Item não encontrado

---

### `DELETE /portfolio/:id`

Remove permanentemente um item de portfólio.

**Auth:** Obrigatória — rank ≥ 2

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do item |

**Respostas**
- `204` — Removido com sucesso
- `401` — Token ausente
- `403` — Rank insuficiente
- `404` — Item não encontrado

---

## Leads

**Política de acesso** (aplicada a todas as rotas de leads):

```
assessor/presidente (rank ≥ 3)
OU qualquer role no setor `comercial`
OU diretor do setor `marketing`
```

**Shape de lead:**

```json
{
  "id": "uuid",
  "company_name": "Empresa ABC",
  "cnpj": "12.345.678/0001-95",
  "created_by": "uuid",
  "status": "nao_contatado",
  "address_logradouro": "Rua das Flores",
  "address_numero": "42",
  "address_complemento": null,
  "address_bairro": "Jardim Paulista",
  "address_cidade": "São Paulo",
  "address_estado": "SP",
  "address_cep": "01310100",
  "interest_items": ["Consultoria Energética"],
  "contacts": [...],
  "comments": [...],
  "created_at": "...",
  "updated_at": "..."
}
```

---

### `GET /leads/cnpj/:cnpj`

Consulta dados públicos de uma empresa pelo CNPJ. Verifica cache interno antes de chamar a ReceitaWS.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `cnpj` | string | Exatamente 14 dígitos numéricos sem máscara (ex: `12345678000195`) |

**Resposta 200** — JSON completo retornado pela ReceitaWS (sem transformação)

**Respostas**
- `200` — Dados da empresa
- `400` — CNPJ inválido (quantidade de dígitos incorreta ou dígitos verificadores inválidos)
- `401` — Token ausente
- `403` — Acesso não autorizado pela política de leads
- `429` — Limite de 3 consultas/min da ReceitaWS atingido (cache evita este erro para CNPJs já consultados)
- `502` — Falha na consulta à ReceitaWS (CNPJ não encontrado, inativo, ou API indisponível)

---

### `GET /leads`

Lista todos os leads com `contacts` e `comments` incluídos.

**Auth:** Política de leads

**Respostas**
- `200` — Array de leads (shape completo)
- `401` — Token ausente
- `403` — Acesso não autorizado

---

### `POST /leads`

Cria um novo lead. `created_by` é preenchido automaticamente com o caller.

**Auth:** Política de leads

**Body**

```json
{
  "company_name": "Empresa ABC",
  "cnpj": "12.345.678/0001-95",
  "address_logradouro": "Rua das Flores",
  "address_numero": "42",
  "address_bairro": "Jardim Paulista",
  "address_cidade": "São Paulo",
  "address_estado": "SP",
  "address_cep": "01310100",
  "status": "nao_contatado",
  "interest_items": ["Consultoria Energética"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `company_name` | string | Sim | |
| `cnpj` | string | Sim | Formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos |
| `address_logradouro` | string | Sim | |
| `address_numero` | string | Sim | |
| `address_complemento` | string | Não | |
| `address_bairro` | string | Sim | |
| `address_cidade` | string | Sim | |
| `address_estado` | string | Sim | |
| `address_cep` | string | Sim | |
| `status` | enum | Não | Padrão: `nao_contatado` |
| `interest_items` | string[] | Não | Validado contra itens ativos do portfólio |

**Respostas**
- `201` — Lead criado (shape sem `contacts` e `comments`)
- `400` — Campo obrigatório ausente, `cnpj` inválido, ou `interest_items` não encontrado no portfólio
- `401` — Token ausente
- `403` — Acesso não autorizado

---

### `GET /leads/:id`

Retorna um lead com detalhes completos: `contacts`, `interest_items` e `comments` (ordenados por `created_at ASC`).

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |

**Respostas**
- `200` — Lead completo
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Lead não encontrado

---

### `PATCH /leads/:id`

Atualiza parcialmente um lead. `interest_items`, se fornecido, substitui o array completo.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |

**Body** — Qualquer subconjunto dos campos do lead (exceto `created_by` e `created_at`)

**Respostas**
- `200` — Lead atualizado (shape sem `contacts` e `comments`)
- `400` — `status` ou `cnpj` inválido, ou `interest_items` não encontrado no portfólio
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Lead não encontrado

---

### `DELETE /leads/:id`

Remove permanentemente um lead (cascata em contatos e comentários).

**Auth:** Política de leads — somente o criador ou rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |

**Respostas**
- `204` — Removido com sucesso
- `401` — Token ausente
- `403` — Não é o criador e não tem rank ≥ 3
- `404` — Lead não encontrado

---

### Contatos

#### `POST /leads/:id/contacts`

Adiciona um contato ao lead. Ao menos `email` ou `phone` deve ser informado.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |

**Body**

```json
{
  "name": "João Silva",
  "role": "Diretor",
  "email": "joao@empresa.com",
  "phone": "11999999999"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `name` | string | Sim |
| `role` | string | Sim |
| `email` | string | Não — mas `email` ou `phone` é obrigatório |
| `phone` | string | Não — mas `email` ou `phone` é obrigatório |

**Resposta 201**

```json
{
  "id": "uuid",
  "lead_id": "uuid",
  "name": "João Silva",
  "role": "Diretor",
  "email": "joao@empresa.com",
  "phone": null
}
```

**Respostas**
- `201` — Contato criado
- `400` — Nem `email` nem `phone` fornecidos
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Lead não encontrado

---

#### `PATCH /leads/:id/contacts/:contact_id`

Atualiza parcialmente um contato. Mantém a constraint `email OR phone` após o update.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |
| `contact_id` | UUID | ID do contato |

**Body** — Qualquer subconjunto de `name`, `role`, `email`, `phone`

**Respostas**
- `200` — Contato atualizado
- `400` — Update resultaria em ausência de `email` e `phone`
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Contato não encontrado ou não pertence ao lead

---

#### `DELETE /leads/:id/contacts/:contact_id`

Remove um contato do lead.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |
| `contact_id` | UUID | ID do contato |

**Respostas**
- `204` — Removido com sucesso
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Contato não encontrado

---

### Comentários

#### `POST /leads/:id/comments`

Adiciona um comentário ao lead. `user_id` é preenchido automaticamente com o caller.

**Auth:** Política de leads

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |

**Body**

```json
{ "content": "Cliente demonstrou interesse em auditoria." }
```

**Resposta 201**

```json
{
  "id": "uuid",
  "lead_id": "uuid",
  "user_id": "uuid",
  "content": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

**Respostas**
- `201` — Comentário criado
- `400` — `content` vazio ou ausente
- `401` — Token ausente
- `403` — Acesso não autorizado
- `404` — Lead não encontrado

---

#### `PATCH /leads/:id/comments/:comment_id`

Edita o conteúdo de um comentário. Somente o criador pode editar.

**Auth:** Política de leads — somente o criador

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |
| `comment_id` | UUID | ID do comentário |

**Body**

```json
{ "content": "Texto corrigido." }
```

**Respostas**
- `200` — Comentário atualizado com `updated_at` preenchido
- `401` — Token ausente
- `403` — Caller não é o criador do comentário
- `404` — Comentário não encontrado

---

#### `DELETE /leads/:id/comments/:comment_id`

Remove um comentário. Permitido para o criador ou para quem tem rank **estritamente maior** que o do criador.

**Auth:** Política de leads — criador ou rank > rank do criador

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do lead |
| `comment_id` | UUID | ID do comentário |

**Respostas**
- `204` — Removido com sucesso
- `401` — Token ausente
- `403` — Caller não é o criador nem tem rank superior
- `404` — Comentário não encontrado

---

## Norms

**Shape de norma:**

```json
{
  "id": "uuid",
  "code": "AN01",
  "description": "...",
  "severity": "leve",
  "created_at": "...",
  "updated_at": "..."
}
```

Severidades válidas: `leve` · `moderada` · `grave` · `desligamento`

---

### `GET /norms`

Lista todas as normas do estatuto interno, ordenadas por código.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de normas
- `401` — Token ausente

---

### `POST /norms`

Cria uma nova norma.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{ "code": "AN32", "description": "Descrição da nova norma", "severity": "leve" }
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `code` | string | Sim |
| `description` | string | Sim |
| `severity` | enum | Sim |

**Respostas**
- `201` — Norma criada
- `400` — Campo obrigatório ausente ou inválido
- `401` — Token ausente
- `403` — Rank insuficiente
- `409` — Código já existe

---

### `PUT /norms/:id`

Edita descrição e/ou severidade de uma norma. O campo `code` é ignorado.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da norma |

**Body**

```json
{ "description": "Nova descrição", "severity": "moderada" }
```

**Respostas**
- `200` — Norma atualizada
- `401` — Token ausente
- `403` — Rank insuficiente
- `404` — Norma não encontrada

---

### `DELETE /norms/:id`

Remove permanentemente uma norma.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da norma |

**Respostas**
- `204` — Removida com sucesso
- `401` — Token ausente
- `403` — Rank insuficiente
- `404` — Norma não encontrada
- `409` — Existem faltas associadas a essa norma

---

## Violations

Sistema de registro de infrações ao estatuto. Pontuação: `leve` = 1pt · `moderada` = 2pt · `grave` = 6pt · `desligamento` = 18pt. Score ≥ 18 = risco de desligamento. Faltas expiram após 1 ano.

**Shape de violation:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "norm": {
    "id": "uuid",
    "code": "AN01",
    "description": "...",
    "severity": "leve",
    "points": 1
  },
  "source": "manual",
  "reason": null,
  "status": "active",
  "expires_at": "2027-06-02T00:00:00Z",
  "cancelled_at": null,
  "applied_at": "2026-06-02T00:00:00Z",
  "applied_by": "uuid",
  "created_at": "..."
}
```

> `applied_by` é omitido em `GET /violations/me` e `GET /violations`; presente em `GET /violations/:id`.

---

### `GET /violations/me`

Retorna as próprias faltas do caller com o placar acumulado. `applied_by` é omitido.

**Auth:** Obrigatória

**Resposta 200**

```json
{
  "violations": [...],
  "summary": {
    "score": 1,
    "active_leves": 1,
    "active_moderadas": 0,
    "active_graves": 0,
    "active_desligamentos": 0,
    "at_risk": false
  }
}
```

**Respostas**
- `200` — Faltas e placar do caller
- `401` — Token ausente

---

### `GET /violations`

Retorna faltas dos membros visíveis na hierarquia do caller. `applied_by` é omitido.

**Auth:** Obrigatória

**Visibilidade:**

| Caller | Vê faltas de |
|--------|-------------|
| `consultor` | Ninguém (usar `/violations/me`) |
| `gerente` | Subordinados do mesmo setor |
| `diretor` (comercial/marketing) | Subordinados de ambos os setores |
| `assessor` / `presidente` | Todos os membros |

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | Filtra por membro específico (opcional) |

**Resposta 200** — Array de `{ user_id, violations[], summary }`

**Respostas**
- `200` — Faltas dos subordinados visíveis
- `401` — Token ausente
- `403` — `user_id` fora da hierarquia do caller

---

### `GET /violations/:id`

Retorna detalhes completos de uma falta, **incluindo** `applied_by`.

**Auth:** Obrigatória — dono da falta ou superiores hierárquicos

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da falta |

**Respostas**
- `200` — Falta completa (`applied_by` = `null` para faltas automáticas)
- `401` — Token ausente
- `403` — Sem autoridade sobre a falta
- `404` — Falta não encontrada

---

### `POST /violations`

Aplica uma falta a um membro. Após a criação, um email é enviado ao infrator.

**Auth:** Obrigatória — rank ≥ 1, com autoridade hierárquica sobre o alvo

**Body**

```json
{
  "user_id": "uuid-do-membro",
  "norm_id": "uuid-da-norma",
  "reason": "Justificativa opcional"
}
```

**Respostas**
- `201` — Falta criada (com `applied_by` = caller, `source: "manual"`)
- `400` — Campo obrigatório ausente
- `401` — Token ausente
- `403` — Sem autoridade hierárquica sobre o alvo
- `404` — Membro ou norma não encontrado

---

### `DELETE /violations/:id`

Cancela (soft-delete) uma falta. Faltas canceladas permanecem com `status: "cancelled"` mas não entram no score.

**Auth:** Obrigatória — próprio aplicador (`applied_by = caller`) ou rank > rank do aplicador

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da falta |

**Respostas**
- `204` — Cancelada com sucesso
- `401` — Token ausente
- `403` — Sem autoridade para cancelar
- `404` — Falta não encontrada
- `409` — Falta já cancelada

---

## Internal Jobs

Endpoints do namespace `/internal` são para uso exclusivo de automações internas. **Não requerem JWT.** Toda requisição deve incluir o header `X-Internal-Secret` com o valor da env var `INTERNAL_JOB_SECRET`. Requests sem o header ou com valor incorreto retornam `401`.

---

### `POST /internal/weekly-absence-check`

Verifica as horas registradas na semana anterior e aplica faltas automáticas a quem ficou abaixo do mínimo. Faltas são inseridas com `source = "automatic"` e `applied_by = null`. Um email é enviado para cada falta aplicada.

**Auth:** Header `X-Internal-Secret: <INTERNAL_JOB_SECRET>`

**Regra de seleção de norma:**

| Condição | Falta |
|----------|-------|
| `total_minutes ≥ min_week_hours × 60` | Nenhuma |
| `total_minutes ≥ (min_week_hours / 2) × 60` | AN07 (leve) |
| `total_minutes < (min_week_hours / 2) × 60` | AN13 (moderada) |

**Idempotência:** se o job já foi executado na semana corrente, retorna `{ already_ran: true }` sem processar nada.

**Respostas**
- `200` — `{ "week_start": "...", "users_checked": 12, "violations_applied": 3 }` — execução normal
- `200` — `{ "already_ran": true }` — já executado esta semana
- `401` — Header ausente ou secret incorreto

---

## Houses

### `GET /houses`

Lista as 3 casas fixas (Lumina, Voltus, Nexus) com a pontuação total de cada uma no ciclo ativo.

**Auth:** Obrigatória

**Resposta 200**

```json
[
  { "id": "uuid", "name": "Lumina", "total_points": 150 },
  { "id": "uuid", "name": "Voltus", "total_points": 95 },
  { "id": "uuid", "name": "Nexus", "total_points": 210 }
]
```

**Respostas**
- `200` — Array de casas com pontuação

---

### `GET /houses/:id/members`

Lista os membros de uma casa específica.

**Auth:** Obrigatória

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da casa |

**Respostas**
- `200` — Array de usuários da casa
- `404` — Casa inexistente

---

### `PATCH /houses/members/:user_id`

Atribui um usuário a uma casa.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | ID do usuário |

**Body**

```json
{ "house_id": "uuid-da-casa" }
```

**Respostas**
- `200` — Usuário atualizado com `house_id`
- `403` — Papel não autorizado
- `404` — Usuário ou casa inexistente

---

## Gamification

### Ciclos

#### `GET /gamification/cycles`

Lista todos os ciclos em ordem decrescente de `started_at`.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de ciclos

---

#### `GET /gamification/cycles/active`

Retorna o ciclo ativo (sem `ended_at`).

**Auth:** Obrigatória

**Resposta 200**

```json
{
  "id": "uuid",
  "name": "1º Semestre 2026",
  "started_at": "2026-06-04T00:00:00Z",
  "ended_at": null,
  "created_by": "uuid",
  "created_at": "..."
}
```

**Respostas**
- `200` — Ciclo ativo
- `404` — Nenhum ciclo ativo

---

#### `POST /gamification/cycles`

Cria um novo ciclo. Falha se já houver um ciclo ativo.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{ "name": "1º Semestre 2026" }
```

**Respostas**
- `201` — Ciclo criado
- `409` — Já existe um ciclo ativo

---

#### `PATCH /gamification/cycles/:id/close`

Encerra o ciclo. Bloqueado se houver submissões pendentes.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID do ciclo |

**Respostas**
- `200` — Ciclo com `ended_at` preenchido
- `409` — Submissões pendentes ou ciclo já encerrado

---

### Tarefas

#### `GET /gamification/tasks`

Lista as tarefas ativas. Rank ≥ 3 pode incluir inativas com `?include_inactive=true`.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de tarefas

---

#### `POST /gamification/tasks`

Cria uma nova tarefa.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{
  "title": "Participar de vídeo do marketing",
  "description": "Aparecer em um vídeo oficial da Watt Consultoria",
  "points": 50
}
```

**Respostas**
- `201` — Tarefa criada com `is_active: true`

---

#### `PATCH /gamification/tasks/:id`

Edita título, descrição, pontos e/ou status de ativação de uma tarefa.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da tarefa |

**Body** — Qualquer subconjunto de `title`, `description`, `points`, `is_active`

```json
{ "points": 75, "is_active": false }
```

**Respostas**
- `200` — Tarefa atualizada
- `404` — Tarefa inexistente

---

### Submissões

#### `POST /gamification/submissions`

Submete um comprovante de conclusão de tarefa. O arquivo deve ser enviado previamente ao bucket `gamification-proofs`.

**Auth:** Obrigatória

**Validações:** usuário com casa atribuída, ciclo ativo existente, tarefa ativa, arquivo no storage.

**Body**

```json
{
  "task_id": "uuid-da-tarefa",
  "description": "Participei do vídeo em 04/06/2026",
  "file_path": "proofs/uuid-do-usuario/nome-do-arquivo.pdf"
}
```

**Respostas**
- `201` — Submissão criada com `status: "pending"`, `house_id` e `cycle_id` snapshots
- `400` — Usuário sem casa, sem ciclo ativo, tarefa inativa ou arquivo não encontrado

---

#### `GET /gamification/submissions`

Lista submissões com `file_url` (signed URL válida por 1h). Usuários comuns veem apenas as próprias; rank ≥ 3 pode filtrar com `?status=pending` e/ou `?user_id=uuid`.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de submissões

---

#### `PATCH /gamification/submissions/:id/review`

Aprova ou rejeita uma submissão pendente.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | ID da submissão |

**Body**

```json
{
  "status": "approved",
  "rejection_reason": "opcional — apenas para rejections"
}
```

**Respostas**
- `200` — Submissão atualizada com `reviewed_by` e `reviewed_at`
- `404` — Submissão inexistente
- `409` — Submissão já revisada

---

### Leaderboard

#### `GET /gamification/leaderboard`

Placar das 3 casas. Padrão: ciclo ativo. Aceita `?cycle_id=uuid` para ciclos históricos.

**Auth:** Obrigatória

**Resposta 200** — Casas ordenadas por `total_points` decrescente

```json
[
  { "house_id": "uuid", "house_name": "Nexus", "total_points": 210 },
  { "house_id": "uuid", "house_name": "Lumina", "total_points": 150 },
  { "house_id": "uuid", "house_name": "Voltus", "total_points": 95 }
]
```

**Respostas**
- `200` — Placar das casas
- `404` — Nenhum ciclo ativo e `cycle_id` não informado

---

#### `GET /gamification/leaderboard/podium`

Pódio individual dos membros de uma casa. `house_id` é obrigatório; `cycle_id` é opcional (padrão: ciclo ativo).

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `house_id` | UUID | Sim | ID da casa |
| `cycle_id` | UUID | Não | ID do ciclo (padrão: ativo) |

**Resposta 200**

```json
[
  {
    "user_id": "uuid",
    "user_name": "Danilo Silva",
    "points_contributed": 150,
    "approved_count": 3
  }
]
```

**Respostas**
- `200` — Pódio da casa
- `400` — `house_id` ausente
- `404` — Nenhum ciclo ativo e `cycle_id` não informado

---

## Processo Seletivo

### Processos

#### `POST /selection-process`

Cria um novo processo seletivo. Rejeita se o range de datas sobrepõe um processo já existente.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{
  "title": "Processo Seletivo 2026.1",
  "starts_at": "2026-03-01T00:00:00Z",
  "ends_at": "2026-04-01T00:00:00Z"
}
```

**Resposta 201**

```json
{
  "id": "uuid",
  "title": "Processo Seletivo 2026.1",
  "starts_at": "2026-03-01T00:00:00.000Z",
  "ends_at": "2026-04-01T00:00:00.000Z",
  "created_at": "..."
}
```

**Respostas**
- `201` — Processo criado
- `400` — `ends_at` anterior ou igual a `starts_at`
- `401` — Sem token
- `403` — Role insuficiente
- `409` — Range sobrepõe processo existente

---

#### `PATCH /selection-process/:processId`

Atualiza os dados de um processo seletivo. Validações de `ends_at > starts_at` e de sobreposição são reexecutadas se as datas forem alteradas.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `processId` | UUID | ID do processo |

**Body** — Pelo menos um campo obrigatório: `title`, `starts_at`, `ends_at`

**Respostas**
- `200` — Processo atualizado (mesmo shape do POST 201)
- `400` — Nenhum campo fornecido, ou `ends_at` resultante anterior a `starts_at`
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Processo não encontrado
- `409` — Range resultante sobrepõe outro processo existente

---

#### `GET /selection-process`

Lista todos os processos seletivos ordenados por `starts_at` decrescente.

**Auth:** Obrigatória

**Respostas**
- `200` — Array de processos (shape do POST 201)

---

### Candidaturas

#### `POST /selection-process/applications`

Submete uma candidatura ao processo seletivo ativo. O frontend deve fazer upload dos 3 arquivos ao bucket `selection-process-files` antes de chamar este endpoint.

**Auth:** Pública

**Body**

```json
{
  "name": "João da Silva",
  "course": "Engenharia de Software",
  "period": 5,
  "phone": "11999990000",
  "email": "joao@example.com",
  "instagram": "@joaosilva",
  "how_heard": "Indicação de amigo",
  "motivation": "Quero aprender e crescer profissionalmente",
  "why_watt": "A Watt tem projetos alinhados com meus valores",
  "shirt_size": "M",
  "resume_path": "550e8400-e29b-41d4-a716-446655440000/resume.pdf",
  "transcript_path": "550e8400-e29b-41d4-a716-446655440000/transcript.pdf",
  "photo_path": "550e8400-e29b-41d4-a716-446655440000/photo.jpg"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `shirt_size` | enum | `P`, `M`, `G`, `GG`, `XG` |
| `period` | integer | Inteiro positivo |
| `resume_path`, `transcript_path`, `photo_path` | string | Formato `{uuid}/{resume\|transcript\|photo}.{ext}` |

**Resposta 201**

```json
{
  "id": "uuid",
  "created_at": "2026-03-10T14:00:00.000Z"
}
```

**Respostas**
- `201` — Candidatura criada
- `400` — Campo ausente, formato de path inválido, ou arquivo não encontrado no storage
- `404` — Nenhum processo seletivo ativo
- `409` — Email já cadastrado neste processo

---

#### `GET /selection-process/applications`

Lista candidaturas com URLs assinadas (válidas por 1h) para os 3 arquivos de cada candidatura.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `selection_process_id` | UUID | Filtra por processo (opcional) |

**Resposta 200** — Array de candidaturas com `resume_signed_url`, `transcript_signed_url`, `photo_signed_url` e `status`

**Respostas**
- `200` — Array de candidaturas
- `404` — `selection_process_id` informado não existe

---

#### `PATCH /selection-process/applications/:applicationId`

Atualiza o status de uma candidatura.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `applicationId` | UUID | ID da candidatura |

**Body**

```json
{ "status": "approved" }
```

| `status` | Side-effect |
|----------|-------------|
| `approved` | Cria candidato na etapa 1 + envia email de aprovação |
| `reproved` | Envia email de rejeição |
| `pending` / `waitlisted` | Apenas atualiza o campo, sem side-effects |

**Respostas**
- `200` — Candidatura atualizada
- `400` — Status inválido ou processo sem etapas cadastradas
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Candidatura não encontrada
- `409` — Candidato já existe para esta candidatura

---

### Etapas

#### `POST /selection-process/stages`

Cria uma etapa em um processo seletivo.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{
  "selection_process_id": "uuid",
  "name": "Entrevista",
  "position": 1
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `selection_process_id` | UUID | Sim | ID do processo |
| `name` | string | Sim | Nome da etapa |
| `position` | integer | Sim | Inteiro positivo; único por processo |
| `shift` | boolean | Não — padrão `false` | Quando `true`, desloca +1 todas as etapas com `position ≥ position` antes de inserir |

**Resposta 201**

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "name": "Entrevista",
  "position": 1,
  "created_at": "..."
}
```

**Respostas**
- `201` — Etapa criada
- `400` — Campo ausente ou `position ≤ 0`
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Processo não encontrado
- `409` — Posição já existe neste processo (apenas quando `shift = false`)

---

#### `PUT /selection-process/stages/:stageId`

Atualiza nome e/ou posição de uma etapa. Quando a posição alvo está ocupada por outra etapa, as posições são trocadas atomicamente.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `stageId` | UUID | ID da etapa |

**Body** — Pelo menos um campo: `name`, `position`

```json
{ "name": "Entrevista Técnica", "position": 2 }
```

**Respostas**
- `200` — Etapa atualizada
- `400` — Nenhum campo fornecido ou `position ≤ 0`
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Etapa não encontrada

---

#### `GET /selection-process/stages`

Lista etapas de processos seletivos, ordenadas por `position` ascendente.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `selection_process_id` | UUID | Filtra por processo (opcional) |

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "name": "Entrevista",
    "position": 1,
    "created_at": "..."
  }
]
```

**Respostas**
- `200` — Array de etapas
- `401` — Sem token
- `404` — Processo filtrado não encontrado

---

### Candidatos

#### `GET /selection-process/candidates`

Lista candidatos criados a partir de candidaturas aprovadas.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `selection_process_id` | UUID | Filtra por processo (opcional) |
| `stage_id` | UUID | Filtra por etapa atual (opcional) |

**Resposta 200** — Array de candidatos com `photo_signed_url`

```json
[
  {
    "id": "uuid",
    "application_id": "uuid",
    "selection_process_id": "uuid",
    "current_stage_id": "uuid",
    "name": "João Silva",
    "course": "Engenharia",
    "period": 3,
    "phone": "11999990000",
    "email": "joao@example.com",
    "photo_signed_url": "https://...",
    "shirt_size": "M",
    "status": "active",
    "created_at": "..."
  }
]
```

**Respostas**
- `200` — Array de candidatos
- `401` — Sem token
- `404` — Processo filtrado não encontrado

---

#### `PATCH /selection-process/candidates/:candidateId`

Avança ou elimina um candidato em uma etapa.

**Auth:** Obrigatória — rank ≥ 3

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `candidateId` | UUID | ID do candidato |

**Body**

```json
{ "status": "approved" }
```

| `status` | Comportamento |
|----------|---------------|
| `approved` + próxima etapa existe | Avança `current_stage_id` para `position+1`; mantém `status: active`; envia email de avanço |
| `approved` na última etapa | Atualiza `status: approved`; envia email de aprovação final |
| `reproved` | Atualiza `status: eliminated`; envia email de eliminação |

**Respostas**
- `200` — Candidato atualizado
- `400` — Status inválido
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Candidato não encontrado
- `409` — Candidato já finalizado (`eliminated` ou `approved`)

---

### Entrevistas

Sistema de agendamento para o processo seletivo. Consultores cadastram horários disponíveis, admins enviam links por email, e candidatos agendam via link autenticado por token.

> Cada candidato tem exatamente 1 entrevista, conduzida por 2 consultores sorteados aleatoriamente entre os disponíveis no horário.

---

#### `POST /selection-process/interviews`

Cadastra lotes de horários disponíveis para o consultor autenticado.

**Auth:** Obrigatória

**Body**

```json
{ "slots": ["2027-01-20T14:00:00Z", "2027-01-21T09:00:00Z"] }
```

**Validações:**
- Horário deve ser hora fechada (minutos = 0)
- Hora em BRT (UTC-3) deve estar entre 08:00 e 19:00
- Não pode ser no passado
- Slots duplicados para o mesmo consultor são ignorados silenciosamente (`ON CONFLICT DO NOTHING`)

**Resposta 201** — Array de slots criados (duplicatas não retornam)

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "consultant_id": "uuid",
    "starts_at": "2027-01-20T14:00:00.000Z",
    "ends_at": "2027-01-20T15:00:00.000Z",
    "booking_id": null,
    "created_at": "..."
  }
]
```

**Respostas**
- `201` — Slots criados
- `400` — Horário inválido (não é hora fechada, fora do intervalo BRT, ou no passado)
- `401` — Sem token
- `404` — Nenhum processo seletivo ativo

---

#### `GET /selection-process/interviews`

Lista horários disponíveis para agendamento (uso público, para candidatos).

**Auth:** Pública

Retorna apenas horários com **≥ 2 slots livres** (sem `booking_id`).

**Resposta 200**

```json
[
  {
    "starts_at": "2027-01-20T14:00:00.000Z",
    "ends_at": "2027-01-20T15:00:00.000Z"
  }
]
```

Retorna `[]` se não houver processo ativo ou nenhum horário com ≥ 2 slots livres.

---

#### `GET /selection-process/interviews/slots`

Lista os próprios slots do consultor autenticado. Assessores e presidentes veem todos os slots de todos os consultores.

**Auth:** Obrigatória

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "consultant_id": "uuid",
    "consultant_name": "Maria Silva",
    "starts_at": "...",
    "ends_at": "...",
    "booking_id": "uuid",
    "candidate_name": "João Costa",
    "candidate_email": "joao@example.com",
    "created_at": "..."
  }
]
```

> `consultant_name` presente apenas para rank ≥ 3. `candidate_name` e `candidate_email` presentes apenas em slots com `booking_id`.

**Respostas**
- `200` — Slots do consultor
- `401` — Sem token

---

#### `PATCH /selection-process/interviews`

Candidato agenda uma entrevista usando token recebido por email.

**Auth:** Token de agendamento (no body, sem JWT)

**Body**

```json
{
  "starts_at": "2027-01-20T14:00:00Z",
  "token": "abc123..."
}
```

**Comportamento:**
1. Valida token (existe + não expirado) → `401` se inválido
2. Verifica que o candidato ainda não tem entrevista agendada → `409` se já tem
3. Em transação com `FOR UPDATE`: bloqueia slots livres no horário, verifica ≥ 2, sorteia 2 aleatoriamente, cria o booking
4. Envia email de confirmação ao candidato (best-effort)

**Resposta 200**

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "candidate_id": "uuid",
  "starts_at": "2027-01-20T14:00:00.000Z",
  "ends_at": "2027-01-20T15:00:00.000Z",
  "booked_at": "...",
  "created_at": "..."
}
```

**Respostas**
- `200` — Entrevista agendada
- `400` — Body inválido (falta `token` ou `starts_at`)
- `401` — Token inexistente ou expirado
- `409` — Candidato já tem entrevista, ou horário com menos de 2 consultores livres

---

#### `POST /selection-process/interviews/send-link`

Envia links de agendamento por email para candidatos selecionados.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{ "candidate_ids": ["uuid-1", "uuid-2"] }
```

**Comportamento:** Para cada candidato, gera token único (`randomBytes(32).toString('hex')`), salva com `expires_at = processo.ends_at`, e envia email com link `{FRONTEND_URL}/psel/entrevistas/{token}`. Envio é best-effort por candidato.

**Resposta 200**

```json
[
  { "candidate_id": "uuid-1", "success": true },
  { "candidate_id": "uuid-2", "success": true }
]
```

**Respostas**
- `200` — Array com resultado por candidato
- `400` — `candidate_ids` vazio
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Nenhum processo ativo, ou algum `candidate_id` não existe

---

#### `POST /selection-process/interviews/meet-link`

Envia o link do Google Meet ao candidato por email e persiste no booking.

**Auth:** Obrigatória — consultor vinculado ao booking (via `psel_interview_slots`)

**Body**

```json
{
  "booking_id": "uuid-do-booking",
  "meet_link": "https://meet.google.com/abc-defg-hij"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `booking_id` | UUID | UUID do booking |
| `meet_link` | string | Padrão `https://meet.google.com/xxx-xxxx-xxx` (3-4-3 letras minúsculas) |

**Resposta 200** — Booking atualizado com `meet_link`

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "candidate_id": "uuid",
  "starts_at": "2027-01-01T11:00:00.000Z",
  "ends_at": "2027-01-01T12:00:00.000Z",
  "booked_at": "...",
  "meet_link": "https://meet.google.com/abc-defg-hij",
  "created_at": "..."
}
```

**Respostas**
- `200` — Booking atualizado
- `400` — `booking_id` ausente ou `meet_link` com formato inválido
- `401` — Sem token
- `403` — Usuário não é consultor do booking
- `404` — Booking inexistente
- `409` — Booking já possui `meet_link`

---

#### `POST /selection-process/interviews/:bookingId/evaluation`

Registra a avaliação do candidato após a entrevista. Apenas um dos dois consultores da dupla pode submeter. A avaliação é única e imutável por booking.

**Auth:** Obrigatória — consultor vinculado ao booking

**Path params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `bookingId` | UUID | ID do booking |

**Body**

```json
{
  "proatividade": 4,
  "lideranca": 3,
  "transparencia": 5,
  "uniao_de_time": 4,
  "comunicacao": 3,
  "seriedade": 5,
  "compromisso": 4,
  "proposito": 3,
  "autoresponsabilidade": 5,
  "autoconfianca": 4,
  "responsabilidade_social": 3,
  "criatividade": 5,
  "procrastinacao": false,
  "desinteresse": false,
  "falta_de_transparencia": false,
  "proposito_vago": false,
  "vitimizacao": false,
  "falta_de_confianca": false,
  "observacoes": "Candidato demonstrou boa comunicação."
}
```

**Campos:**

Qualidades desejadas — todos obrigatórios, nota inteira de 1 a 5:
`proatividade` · `lideranca` · `transparencia` · `uniao_de_time` · `comunicacao` · `seriedade` · `compromisso` · `proposito` · `autoresponsabilidade` · `autoconfianca` · `responsabilidade_social` · `criatividade`

Comportamentos indesejados — todos obrigatórios, booleano (`true` = candidato apresentou o comportamento):
`procrastinacao` · `desinteresse` · `falta_de_transparencia` · `proposito_vago` · `vitimizacao` · `falta_de_confianca`

Campo opcional: `observacoes` (texto livre, nullable)

**Respostas**
- `201` — Avaliação registrada
- `400` — Nota fora do intervalo (< 1 ou > 5) ou campo obrigatório ausente
- `401` — Sem token
- `403` — Usuário não é consultor do booking
- `404` — Booking inexistente
- `409` — Avaliação já existe para este booking

---

#### `GET /selection-process/interviews/evaluations`

Retorna avaliações de entrevistas com dados do candidato incluídos.

**Auth:** Obrigatória

**Query params**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `selection_process_id` | UUID | Filtra por processo (opcional) |

**Resposta 200** — Array de avaliações com `candidate_id` e `candidate_name`

**Respostas**
- `200` — Array de avaliações
- `401` — Sem token

---

#### `POST /selection-process/send-email`

Envia um email personalizado (HTML + texto plano) para um conjunto de candidatos e retorna o resultado agregado.

**Auth:** Obrigatória — rank ≥ 3

**Body**

```json
{
  "candidate_ids": ["uuid-1", "uuid-2"],
  "subject": "Comunicado do processo seletivo",
  "html": "<p>Olá, candidato!</p>",
  "plain_text": "Olá, candidato!"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `candidate_ids` | UUID[] | Sim — mínimo 1 |
| `subject` | string | Sim |
| `html` | string | Sim |
| `plain_text` | string | Sim |

**Comportamento:**
1. Valida todos os `candidate_ids` — retorna `404` se qualquer ID não existir (sem enviar nenhum email)
2. Envia todos os emails em paralelo (`Promise.allSettled`)
3. Retorna total de envios bem-sucedidos e com erro

**Resposta 200**

```json
{ "successes": 2, "errors": 0 }
```

**Respostas**
- `200` — Resultado agregado dos envios
- `400` — Body inválido ou `candidate_ids` vazio
- `401` — Sem token
- `403` — Role insuficiente
- `404` — Algum `candidate_id` não existe
