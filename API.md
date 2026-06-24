# WattAPI — Documentação

Todas as rotas autenticadas exigem o header `Authorization: Bearer <token>`.

Hierarquia de roles (rank): `consultor` (0) < `gerente` (1) < `diretor` (2) < `assessor` (3) < `presidente` (4).

Superusuário = assessor ou presidente (rank ≥ 3).

---

## Auth

### `GET /auth/me`

Retorna o perfil do usuário autenticado.

**Autenticação:** Obrigatória

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

**Resposta 401** — Token ausente, inválido ou expirado

---

## Users

### `POST /users`

Cria o perfil de um usuário que já existe no Supabase Auth mas ainda não possui cadastro no sistema. O role é definido automaticamente como `consultor`.

**Autenticação:** Obrigatória — JWT de usuário **sem** perfil cadastrado

**Body**

```json
{
  "name": "João Silva",
  "sector": "projetos",
  "cpf": "12345678901"
}
```

| Campo    | Tipo   | Obrigatório | Descrição                                                          |
| -------- | ------ | ----------- | ------------------------------------------------------------------ |
| `name`   | string | sim         | Mínimo 1 caractere                                                 |
| `sector` | enum   | sim         | `projetos`, `comercial`, `marketing`, `executivo`, `institucional` |
| `cpf`    | string | sim         | 11 dígitos ou formato `000.000.000-00`                             |

**Resposta 201** — Perfil criado (shape igual a `GET /auth/me`)

**Resposta 400** — Campos inválidos ou ausentes

**Resposta 401** — Token ausente ou inválido

**Resposta 409** — Usuário já cadastrado, ou CPF/e-mail duplicado

---

### `GET /users`

Lista todos os usuários ativos, ordenados por data de criação.

**Autenticação:** Obrigatória

**Resposta 200** — Array de objetos de usuário

> O campo `cpf` é omitido para usuários com rank < 2.

**Resposta 401** — Token ausente ou inválido

---

### `GET /users/:user_id`

Retorna um usuário específico pelo UUID.

**Autenticação:** Obrigatória

**Parâmetros de path**

| Parâmetro | Tipo | Descrição     |
| --------- | ---- | ------------- |
| `user_id` | UUID | ID do usuário |

**Resposta 200** — Objeto de usuário

> O campo `cpf` é omitido para usuários com rank < 2, exceto quando consultando o próprio perfil.

**Resposta 401** — Token ausente ou inválido

**Resposta 404** — Usuário não encontrado

---

### `PATCH /users/:user_id`

Atualiza dados de um usuário. Usuários comuns podem editar apenas `name` e `cpf` do próprio perfil. Superusuários podem editar qualquer campo de qualquer usuário.

**Autenticação:** Obrigatória — próprio usuário ou superusuário (rank ≥ 3)

**Parâmetros de path**

| Parâmetro | Tipo | Descrição     |
| --------- | ---- | ------------- |
| `user_id` | UUID | ID do usuário |

**Body** (pelo menos um campo obrigatório)

```json
{
  "email": "novo@empresa.com",
  "name": "Novo Nome",
  "role": "gerente",
  "sector": "comercial",
  "cpf": "98765432100"
}
```

| Campo                     | Acessível por                   |
| ------------------------- | ------------------------------- |
| `name`, `cpf`             | Próprio usuário ou superusuário |
| `email`, `role`, `sector` | Apenas superusuário             |

**Resposta 200** — Usuário atualizado

**Resposta 400** — Campos inválidos ou body vazio

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Sem permissão para editar este usuário ou campo

**Resposta 404** — Usuário não encontrado

**Resposta 409** — E-mail ou CPF já em uso

---

### `DELETE /users/:user_id`

Realiza soft delete de um usuário (marca como inativo).

**Autenticação:** Obrigatória — superusuário (rank ≥ 3)

**Parâmetros de path**

| Parâmetro | Tipo | Descrição     |
| --------- | ---- | ------------- |
| `user_id` | UUID | ID do usuário |

**Resposta 204** — Usuário desativado

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Requer rank ≥ 3

**Resposta 404** — Usuário não encontrado

---

## Settings

### `GET /settings`

Retorna as configurações globais da aplicação.

**Autenticação:** Obrigatória

**Resposta 200**

```json
{
  "min_week_hours": 40,
  "min_availability_hours": 0
}
```

**Resposta 401** — Token ausente ou inválido

---

### `PATCH /settings`

Atualiza as configurações globais da aplicação.

**Autenticação:** Obrigatória — superusuário (rank ≥ 3)

**Body** (pelo menos um campo obrigatório)

```json
{
  "min_week_hours": 44,
  "min_availability_hours": 10
}
```

| Campo                    | Tipo                 | Descrição                                                                                              |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `min_week_hours`         | inteiro positivo     | Mínimo de horas semanais exigidas no registro de horas                                                 |
| `min_availability_hours` | inteiro entre 0 e 98 | Mínimo de slots de disponibilidade que o usuário deve configurar em `PUT /routine`. `0` = desabilitado |

**Resposta 200** — Configurações atualizadas

**Resposta 400** — Campos inválidos ou body vazio

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Requer rank ≥ 3

---

## Time Entries

### `GET /time-entries`

Retorna o resumo semanal de horas de todos os membros ativos.

**Autenticação:** Obrigatória — superusuário (rank ≥ 3)

**Query params**

| Parâmetro | Tipo        | Obrigatório | Padrão | Descrição                                     |
| --------- | ----------- | ----------- | ------ | --------------------------------------------- |
| `week`    | inteiro ≥ 0 | não         | `0`    | Offset de semana (0 = atual, 1 = anterior, …) |

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

**Resposta 400** — Parâmetro `week` inválido

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Requer rank ≥ 3

---

### `POST /time-entries/clock-in`

Inicia uma nova sessão de trabalho para o usuário autenticado.

**Autenticação:** Obrigatória

**Resposta 201**

```json
{
  "id": "uuid",
  "clocked_in_at": "2026-05-25T14:30:00.000Z"
}
```

**Resposta 401** — Token ausente ou inválido

**Resposta 409** — Já existe uma sessão aberta

---

### `POST /time-entries/clock-out`

Encerra a sessão de trabalho aberta do usuário autenticado. Sessões com mais de 480 minutos (8 horas) são marcadas como anuladas.

**Autenticação:** Obrigatória

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

**Resposta 401** — Token ausente ou inválido

**Resposta 409** — Nenhuma sessão aberta

---

### `GET /time-entries/summary/me`

Retorna o resumo de horas da semana atual do usuário autenticado.

**Autenticação:** Obrigatória

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

> `current_session` pode ser:
>
> - `{ "status": "none" }` — sem sessão aberta
> - `{ "status": "open", "clocked_in_at": "...", "elapsed_minutes": 120 }` — sessão em andamento
> - `{ "status": "invalid", "reason": "exceeded_max_duration", "clocked_in_at": "...", "elapsed_minutes": 510 }` — sessão excedeu 8h

**Resposta 401** — Token ausente ou inválido

---

### `GET /time-entries/summary/:userId`

Retorna o resumo semanal de um usuário específico.

**Autenticação:** Obrigatória — superusuário (rank ≥ 3)

**Parâmetros de path**

| Parâmetro | Tipo | Descrição          |
| --------- | ---- | ------------------ |
| `userId`  | UUID | ID do usuário alvo |

**Resposta 200** — Mesmo shape de `GET /time-entries/summary/me`

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Requer rank ≥ 3

---

## Activities

Atividades pessoais dos usuários. Cada atividade pertence a um único usuário. Apenas o dono pode criar, editar e deletar suas próprias atividades.

**Modelo de uma atividade**

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
  "created_at": "2026-05-29T08:00:00.000Z",
  "updated_at": "2026-05-29T08:00:00.000Z"
}
```

| Campo                    | Tipo   | Valores                                                 |
| ------------------------ | ------ | ------------------------------------------------------- |
| `priority`               | enum   | `alta`, `media`, `baixa`                                |
| `date`                   | string | Formato `YYYY-MM-DD`                                    |
| `time_start`, `time_end` | string | Formato `HH:MM` — `time_end` deve ser após `time_start` |

---

### `POST /activities`

Cria uma nova atividade para o usuário autenticado.

**Autenticação:** Obrigatória

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

| Campo         | Tipo   | Obrigatório | Descrição                                   |
| ------------- | ------ | ----------- | ------------------------------------------- |
| `name`        | string | sim         | Mínimo 1 caractere                          |
| `description` | string | não         | Descrição livre                             |
| `date`        | string | sim         | Formato `YYYY-MM-DD`                        |
| `time_start`  | string | sim         | Formato `HH:MM`                             |
| `time_end`    | string | sim         | Formato `HH:MM`, deve ser após `time_start` |
| `priority`    | enum   | sim         | `alta`, `media`, `baixa`                    |

**Resposta 201** — Atividade criada

**Resposta 400** — Campos inválidos, ausentes ou `time_end ≤ time_start`

**Resposta 401** — Token ausente ou inválido

---

### `GET /activities`

Lista atividades visíveis ao usuário autenticado, com filtros opcionais de data.

**Autenticação:** Obrigatória

**Regra de visibilidade:**

- Cada usuário sempre vê as próprias atividades
- Vê também atividades de usuários com rank estritamente menor **no mesmo setor**
- Assessor e presidente veem atividades de todos os usuários, independente do setor

| Role do requester | Vê atividades de                                 |
| ----------------- | ------------------------------------------------ |
| consultor         | Apenas as próprias                               |
| gerente           | Próprias + consultores do mesmo setor            |
| diretor           | Próprias + gerentes e consultores do mesmo setor |
| assessor          | Todos                                            |
| presidente        | Todos                                            |

**Query params**

| Parâmetro | Tipo                | Obrigatório | Descrição                                                                            |
| --------- | ------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `id`      | UUID                | não         | Filtra atividades de um usuário específico — regras de visibilidade ainda se aplicam |
| `date`    | string `YYYY-MM-DD` | não         | Filtra por dia exato — sobrescreve `from`/`to`                                       |
| `from`    | string `YYYY-MM-DD` | não         | Início do intervalo (inclusive)                                                      |
| `to`      | string `YYYY-MM-DD` | não         | Fim do intervalo (inclusive)                                                         |

> Sem parâmetros: retorna todas as atividades visíveis. `date` tem precedência sobre `from`/`to` quando ambos estão presentes. O filtro `?id=` não bypassa as regras de visibilidade — se o usuário alvo não estiver no escopo visível do requester, retorna array vazio.

**Resposta 200** — Array de atividades, ordenado por `date DESC, time_start ASC`

**Resposta 401** — Token ausente ou inválido

---

### `GET /activities/me`

Retorna apenas as atividades do próprio usuário autenticado. Equivale a `GET /activities?id=<own_id>`, mas sem depender das regras de visibilidade.

**Autenticação:** Obrigatória

**Query params**

| Parâmetro | Tipo                | Obrigatório | Descrição                                      |
| --------- | ------------------- | ----------- | ---------------------------------------------- |
| `date`    | string `YYYY-MM-DD` | não         | Filtra por dia exato — sobrescreve `from`/`to` |
| `from`    | string `YYYY-MM-DD` | não         | Início do intervalo (inclusive)                |
| `to`      | string `YYYY-MM-DD` | não         | Fim do intervalo (inclusive)                   |

**Resposta 200** — Array das próprias atividades, ordenado por `date DESC, time_start ASC`

**Resposta 401** — Token ausente ou inválido

---

### `PATCH /activities/:id`

Atualiza uma atividade. Apenas o dono pode editar.

**Autenticação:** Obrigatória

**Parâmetros de path**

| Parâmetro | Tipo | Descrição       |
| --------- | ---- | --------------- |
| `id`      | UUID | ID da atividade |

**Body** (pelo menos um campo obrigatório)

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

**Resposta 200** — Atividade atualizada

**Resposta 400** — Campos inválidos ou body vazio

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é o dono da atividade

**Resposta 404** — Atividade não encontrada

---

### `DELETE /activities/:id`

Remove permanentemente uma atividade. Apenas o dono pode deletar.

**Autenticação:** Obrigatória

**Parâmetros de path**

| Parâmetro | Tipo | Descrição       |
| --------- | ---- | --------------- |
| `id`      | UUID | ID da atividade |

**Resposta 204** — Atividade removida

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é o dono da atividade

**Resposta 404** — Atividade não encontrada

---

## Notifications

Notificações do usuário. Podem ser automáticas (geradas pela aplicação) ou dirigidas (criadas por superusuários). A deleção é soft delete — notificações deletadas não aparecem na listagem mas ficam armazenadas no banco.

**Modelo de uma notificação**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Atividade agendada para hoje: Reunião de alinhamento",
  "description": "Alinhamento semanal do time",
  "origin": "automatic",
  "sent_at": "2026-05-30T03:00:00.000Z",
  "created_by": null,
  "created_at": "2026-05-30T03:00:00.000Z"
}
```

| Campo        | Tipo | Valores                 | Descrição                                          |
| ------------ | ---- | ----------------------- | -------------------------------------------------- |
| `origin`     | enum | `automatic`, `directed` | Origem da notificação                              |
| `created_by` | UUID | UUID ou `null`          | ID do superusuário que criou; `null` se automática |

---

### `GET /notifications`

Lista todas as notificações não deletadas do usuário autenticado, ordenado por `sent_at DESC`.

**Autenticação:** Obrigatória

**Resposta 200** — Array de notificações

**Resposta 401** — Token ausente ou inválido

---

### `DELETE /notifications/:id`

Soft delete de uma notificação. Apenas o dono pode deletar.

**Autenticação:** Obrigatória

**Parâmetros de path**

| Parâmetro | Tipo | Descrição         |
| --------- | ---- | ----------------- |
| `id`      | UUID | ID da notificação |

**Resposta 204** — Notificação deletada

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é o dono da notificação

**Resposta 404** — Notificação não encontrada ou já deletada

---

### `POST /notifications`

Cria notificações dirigidas para um grupo de usuários. Exclusivo para superusuários (assessor ou presidente, rank ≥ 3). Uma notificação é criada para cada usuário ativo que corresponder ao filtro `target`. Target vazio (`{}`) envia para todos os usuários ativos.

**Autenticação:** Obrigatória — requer superusuário (rank ≥ 3)

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

| Campo           | Tipo   | Obrigatório | Descrição                                                                    |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `title`         | string | sim         | Mínimo 1 caractere                                                           |
| `description`   | string | não         | Texto livre                                                                  |
| `target`        | objeto | sim         | Filtro de destinatários — ambos os campos opcionais                          |
| `target.sector` | string | não         | Filtra por setor                                                             |
| `target.role`   | enum   | não         | Filtra por role: `consultor`, `gerente`, `diretor`, `assessor`, `presidente` |

**Lógica de `target`:**

| target                                     | Destinatários                      |
| ------------------------------------------ | ---------------------------------- |
| `{}`                                       | Todos os usuários ativos           |
| `{ sector: "comercial" }`                  | Todos os ativos do setor comercial |
| `{ role: "diretor" }`                      | Todos os diretores ativos          |
| `{ sector: "comercial", role: "diretor" }` | Diretor(es) do setor comercial     |

**Resposta 201**

```json
{ "count": 5 }
```

**Resposta 400** — Campos inválidos ou `title` ausente

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é superusuário (rank < 3)

---

## Push Subscriptions

Gerenciamento de subscrições Web Push por dispositivo. Permite que a PWA registre e remova subscrições associadas ao usuário autenticado, e exponha a chave pública VAPID necessária para o registro no `PushManager`.

---

### `GET /push-subscriptions/vapid-public-key`

Retorna a chave pública VAPID necessária para a PWA registrar a subscrição no browser via `PushManager.subscribe()`.

**Autenticação:** Não obrigatória (endpoint público)

**Resposta 200**

```json
{ "vapid_public_key": "BLjCDzqsWtu..." }
```

---

### `POST /push-subscriptions`

Registra a subscrição Web Push do dispositivo atual para o usuário autenticado.

**Autenticação:** Obrigatória

**Body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML",
  "auth": "tBHItJI5svbpez7KI4CCXg"
}
```

| Campo      | Tipo   | Obrigatório | Descrição                                   |
| ---------- | ------ | ----------- | ------------------------------------------- |
| `endpoint` | string | sim         | URL do push service do browser              |
| `p256dh`   | string | sim         | Chave pública do cliente (base64url)        |
| `auth`     | string | sim         | Segredo de autenticação do cliente (base64) |

**Resposta 201**

```json
{ "id": "uuid" }
```

**Resposta 400** — Campos obrigatórios ausentes

**Resposta 401** — Token ausente ou inválido

**Resposta 409** — Endpoint já registrado e ativo para este usuário

---

### `DELETE /push-subscriptions/:id`

Remove (soft delete) uma subscrição de push. Apenas o dono pode remover.

**Autenticação:** Obrigatória

**Parâmetros de path**

| Parâmetro | Tipo | Descrição              |
| --------- | ---- | ---------------------- |
| `id`      | UUID | ID da subscrição       |

**Resposta 204** — Subscrição removida

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é o dono da subscrição

**Resposta 404** — Subscrição não encontrada ou já removida

---

## Status

### `GET /status`

Health check da API. Não requer autenticação.

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

**Resposta 500** — Erro interno no servidor

---

## Routine

Gerencia a disponibilidade semanal de cada contribuinte. A rotina é composta por slots de 1 hora, de segunda a domingo, das 08h às 22h (14 slots × 7 dias = 98 slots por usuário).

### `PUT /routine`

Salva ou substitui a rotina semanal do próprio usuário. A operação é um upsert atômico — todos os slots anteriores são apagados e substituídos pelos novos.

**Acesso:** autenticado

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

**Resposta 200** — sem corpo

**Resposta 400** — payload inválido (dia faltando ou array com tamanho diferente de 14), ou total de slots disponíveis abaixo de `min_availability_hours`

> Quando a validação de `min_availability_hours` falha, a mensagem descreve a situação: `"Disponibilidade insuficiente: você configurou Xh de disponibilidade, mas o mínimo exigido é Yh. Adicione mais Zh de disponibilidade."`

**Resposta 401** — não autenticado

---

### `GET /routine`

Retorna a rotina semanal do próprio usuário autenticado.

**Acesso:** autenticado

**Resposta 200**

```json
{ "slots": { "mon": [bool×14], "tue": [...], "wed": [...], "thu": [...], "fri": [...], "sat": [...], "sun": [...] } }
```

Retorna `{ "slots": null }` se o usuário nunca configurou sua rotina.

---

### `GET /routine/summary`

Retorna dois dados complementares sobre os subordinados do caller: a disponibilidade agregada por slot e a lista de subordinados que ainda não configuraram sua rotina.

**Acesso:** autenticado, rank ≥ 1 (gerente ou superior)

| Caller     | Subordinados visíveis       | Restrição de setor |
| ---------- | --------------------------- | ------------------ |
| Gerente    | consultor                   | mesmo setor        |
| Diretor    | gerente, consultor          | mesmo setor        |
| Assessor   | diretor, gerente, consultor | nenhuma            |
| Presidente | diretor, gerente, consultor | nenhuma            |

**Resposta 200**

```json
{
  "availability": {
    "mon": {
      "8":  [{ "id": "uuid", "name": "Ana", "role": "consultor", "sector": "projetos" }],
      "14": [{ "id": "uuid", "name": "Ana", "role": "consultor", "sector": "projetos" }]
    },
    "wed": { ... }
  },
  "unconfigured": [
    { "id": "uuid", "name": "Carlos", "role": "gerente", "sector": "projetos" }
  ]
}
```

- **`availability`** — objeto aninhado por dia (`mon`–`sun`) e hora (`"8"`–`"21"`). Dias e horas sem nenhum subordinado disponível são omitidos. Subordinados sem rotina configurada não aparecem aqui.
- **`unconfigured`** — lista de subordinados que nunca configuraram sua rotina, ordenados por nome. Cada entrada contém `id`, `name`, `role` e `sector`.

As chaves de hora são strings com o número da hora de início (ex: `"8"` = slot 08h–09h, `"21"` = slot 21h–22h).

Retorna `{ "availability": {}, "unconfigured": [] }` quando o caller não possui subordinados visíveis.

**Resposta 401** — não autenticado

**Resposta 403** — caller é consultor (rank < 1)

---

### `GET /routine/:userId`

Retorna a rotina semanal de outro usuário, sujeito a visibilidade hierárquica.

**Acesso:** autenticado; a visibilidade é verificada no serviço:

- `viewer.id === userId` → autorizado
- `rank(viewer) > rank(target)` e `rank(viewer) ≥ 3` → autorizado (qualquer setor)
- `rank(viewer) > rank(target)` e `viewer.sector === target.sector` → autorizado

**Resposta 200**

```json
{ "slots": { "mon": [bool×14], ... } }
```

Retorna `{ "slots": null }` se o target nunca configurou sua rotina.

**Resposta 401** — não autenticado

**Resposta 403** — caller não tem permissão de visualizar a rotina do target

**Resposta 404** — userId não encontrado

---

## Reimbursements

### `POST /reimbursements`

Cria uma nova solicitação de reembolso. O frontend deve fazer upload dos comprovantes diretamente ao bucket privado `reimbursement-receipts` antes de chamar esta rota, e enviar os storage paths no body.

**Acesso:** autenticado (qualquer usuário)

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

| Campo          | Tipo    | Obrigatório | Descrição                                                                                                    |
| -------------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `title`        | string  | sim         | Mínimo 1 caractere                                                                                           |
| `description`  | string  | sim         | Mínimo 1 caractere                                                                                           |
| `amount_cents` | integer | sim         | Valor em centavos, deve ser positivo                                                                         |
| `category`     | enum    | sim         | `ingresso`, `alimentação`, `transporte`, `equipamento`, `outro`                                              |
| `pix_key`      | string  | sim         | Chave PIX para recebimento                                                                                   |
| `attachments`  | array   | **sim**     | Array de `{ path, name }` com **mínimo 1 item**; cada `path` deve existir no bucket `reimbursement-receipts` |

**Resposta 201** — Reembolso criado

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
  "created_at": "2026-05-31T16:00:00.000Z",
  "updated_at": "2026-05-31T16:00:00.000Z"
}
```

**Resposta 400** — Campos inválidos, categoria inválida, `amount_cents` ≤ 0, `attachments` vazio/ausente, ou path de comprovante não encontrado no storage

**Resposta 401** — Token ausente, inválido ou expirado

---

### `GET /reimbursements`

Lista solicitações de reembolso. Usuários comuns veem apenas as próprias; superusuários (rank ≥ 3) podem ver todas usando `?target=all`.

**Acesso:** autenticado

**Query params**

| Parâmetro | Tipo          | Default | Descrição                                           |
| --------- | ------------- | ------- | --------------------------------------------------- |
| `target`  | `me` \| `all` | `me`    | `me` retorna só os do caller; `all` requer rank ≥ 3 |

**Resposta 200** — Array de reembolsos (mesmo shape do POST 201)

> Cada attachment inclui `signed_url` com validade de 1 hora; o `path` de storage não é exposto.

**Resposta 401** — Token ausente, inválido ou expirado

**Resposta 403** — `target=all` por usuário com rank < 3

---

### `GET /reimbursements/:user_id`

Retorna todas as solicitações de reembolso de um usuário específico. Exclusivo para superusuários.

**Acesso:** autenticado; lógica de acesso verificada no serviço: lança 403 se rank < 3

**Parâmetros de path**

| Parâmetro | Tipo | Descrição          |
| --------- | ---- | ------------------ |
| `user_id` | UUID | ID do usuário alvo |

**Resposta 200** — Array de reembolsos (mesmo shape do POST 201); retorna `[]` se o usuário não tiver reembolsos

**Resposta 401** — Token ausente, inválido ou expirado

**Resposta 403** — Caller com rank < 3

---

### `PATCH /reimbursements/:id/status`

Aprova ou rejeita uma solicitação de reembolso pendente. Status é one-way: uma vez resolvido (`approved` ou `rejected`), não pode ser alterado.

**Acesso:** autenticado; somente Presidente Executivo (rank 4)

**Parâmetros de path**

| Parâmetro | Tipo | Descrição       |
| --------- | ---- | --------------- |
| `id`      | UUID | ID do reembolso |

**Body**

```json
{ "status": "approved" }
```

| Campo    | Tipo | Valores                                            |
| -------- | ---- | -------------------------------------------------- |
| `status` | enum | `approved`, `rejected` (`pending` não é permitido) |

**Resposta 200** — Reembolso atualizado (mesmo shape do POST 201)

**Resposta 400** — `status` inválido, ou reembolso já está `approved`/`rejected`

**Resposta 401** — Token ausente, inválido ou expirado

**Resposta 403** — Caller com rank < 4

**Resposta 404** — Reembolso não encontrado

---

## Portfolio — Itens de Serviços da Empresa

### GET /portfolio

Lista todos os itens do portfólio, ordenados por `name`.

**Acesso:** autenticado (qualquer role)

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "name": "Consultoria Energética",
    "description": "Análise de consumo energético",
    "created_at": "2026-06-02T00:00:00.000Z",
    "updated_at": "2026-06-02T00:00:00.000Z"
  }
]
```

**Resposta 401** — Token ausente, inválido ou expirado

---

### POST /portfolio

Cria um novo item de portfólio.

**Acesso:** `minRank 2` (diretor, assessor, presidente)

**Body**

```json
{ "name": "Auditoria Elétrica", "description": "Verificação de instalações" }
```

| Campo         | Tipo   | Obrigatório          |
| ------------- | ------ | -------------------- |
| `name`        | string | sim — deve ser único |
| `description` | string | não                  |

**Resposta 201** — Item criado (mesmo shape do GET)

**Resposta 400** — `name` ausente

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente (< 2)

**Resposta 409** — `name` já existente

---

### PATCH /portfolio/:id

Atualiza parcialmente um item de portfólio.

**Acesso:** `minRank 2` (diretor, assessor, presidente)

**Body** — ao menos um campo obrigatório

```json
{ "description": "Nova descrição" }
```

**Resposta 200** — Item atualizado (mesmo shape do GET)

**Resposta 400** — Body vazio `{}`

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente

**Resposta 404** — Item não encontrado

---

### DELETE /portfolio/:id

Remove permanentemente um item de portfólio.

**Acesso:** `minRank 2` (diretor, assessor, presidente)

**Resposta 204** — Removido com sucesso

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente

**Resposta 404** — Item não encontrado

---

## Leads — CRM de Prospects

**Acesso para todas as rotas de leads:**

```
rba: [['minRank', 3], ['sector', 'comercial'], ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]
```

Ou seja: assessor/presidente (qualquer setor), qualquer role no setor `comercial`, ou diretor do setor `marketing`.

### GET /leads/cnpj/:cnpj

Consulta dados públicos de uma empresa pelo CNPJ. Verifica o cache interno antes de chamar a ReceitaWS, armazenando o resultado para consultas futuras.

**Path param:** `:cnpj` — exatamente 14 dígitos numéricos sem máscara (ex: `12345678000195`).

**Resposta 200** — JSON completo retornado pela ReceitaWS (sem transformação)

```json
{
  "cnpj": "12.345.678/0001-95",
  "tipo": "MATRIZ",
  "nome": "EMPRESA EXEMPLO LTDA",
  "fantasia": "",
  "abertura": "01/01/2000",
  "situacao": "ATIVA",
  "logradouro": "RUA DAS FLORES",
  "numero": "42",
  "municipio": "SAO PAULO",
  "uf": "SP",
  "cep": "01310-100",
  "email": "contato@empresa.com.br",
  "telefone": "(11) 1234-5678"
}
```

**Resposta 400** — CNPJ inválido (quantidade de dígitos incorreta ou dígitos verificadores inválidos)

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado pela política de leads

**Resposta 429** — Limite de 3 consultas/minuto da ReceitaWS atingido (plano gratuito) — o cache evita este erro para CNPJs já consultados

**Resposta 502** — Falha na consulta à ReceitaWS (CNPJ não encontrado, inativo, ou API indisponível)

---

### GET /leads

Lista todos os leads com detalhes completos, incluindo `contacts` e `comments` de cada lead.

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "company_name": "Empresa ABC",
    "cnpj": "12.345.678/0001-95",
    "created_by": "uuid-do-usuario",
    "status": "nao_contatado",
    "address_logradouro": "Rua das Flores",
    "address_numero": "42",
    "address_complemento": null,
    "address_bairro": "Jardim Paulista",
    "address_cidade": "São Paulo",
    "address_estado": "SP",
    "address_cep": "01310100",
    "interest_items": ["Consultoria Energética"],
    "contacts": [
      {
        "id": "uuid",
        "lead_id": "uuid",
        "name": "João",
        "role": "Diretor",
        "email": "joao@abc.com",
        "phone": null
      }
    ],
    "comments": [
      {
        "id": "uuid",
        "lead_id": "uuid",
        "user_id": "uuid",
        "content": "Comentário.",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "created_at": "2026-06-02T00:00:00.000Z",
    "updated_at": "2026-06-02T00:00:00.000Z"
  }
]
```

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado pela política de leads

---

### POST /leads

Cria um novo lead. O campo `created_by` é preenchido automaticamente com o caller.

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

| Campo                 | Tipo     | Obrigatório                                                                                      |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `company_name`        | string   | sim                                                                                              |
| `cnpj`                | string   | sim — formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos (algoritmo Receita Federal) |
| `address_logradouro`  | string   | sim                                                                                              |
| `address_numero`      | string   | sim                                                                                              |
| `address_complemento` | string   | não                                                                                              |
| `address_bairro`      | string   | sim                                                                                              |
| `address_cidade`      | string   | sim                                                                                              |
| `address_estado`      | string   | sim                                                                                              |
| `address_cep`         | string   | sim                                                                                              |
| `status`              | enum     | não — padrão `nao_contatado`                                                                     |
| `interest_items`      | string[] | não — validado contra `portfolio_items` ativos                                                   |

**Resposta 201** — Lead criado (mesmo shape do GET /leads/:id, sem `contacts` e `comments`)

**Resposta 400** — Campo obrigatório ausente, `cnpj` inválido (formato ou dígitos verificadores), ou `interest_items` com nome não encontrado no portfólio

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado pela política de leads

---

### GET /leads/:id

Retorna um lead com detalhes completos: `contacts`, `interest_items`, `cnpj` e `comments` (ordenados por `created_at` ASC).

**Resposta 200**

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
  "contacts": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "name": "João",
      "role": "Diretor",
      "email": "joao@abc.com",
      "phone": null
    }
  ],
  "comments": [
    {
      "id": "uuid",
      "lead_id": "uuid",
      "user_id": "uuid",
      "content": "Comentário.",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "created_at": "2026-06-02T00:00:00.000Z",
  "updated_at": "2026-06-02T00:00:00.000Z"
}
```

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Lead não encontrado

---

### PATCH /leads/:id

Atualiza parcialmente um lead. `interest_items`, se fornecido, substitui o array completo. `cnpj`, se fornecido, deve estar no formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos.

**Body** — qualquer subconjunto dos campos do lead (exceto `created_by` e `created_at`)

```json
{
  "cnpj": "98.765.432/0001-98",
  "status": "em_progresso"
}
```

**Resposta 200** — Lead atualizado (shape do GET /leads/:id, sem `contacts` e `comments`)

**Resposta 400** — `status` inválido, `cnpj` inválido (formato ou dígitos verificadores), ou `interest_items` com nome não encontrado no portfólio

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Lead não encontrado

---

### DELETE /leads/:id

Remove permanentemente um lead (cascata em contatos e comentários).

**Acesso extra (verificado no service):** somente o criador ou superuser (rank >= 3)

**Resposta 204** — Removido com sucesso

**Resposta 401** — Token ausente

**Resposta 403** — Não é o criador e não é superuser

**Resposta 404** — Lead não encontrado

---

## Leads — Contatos

### POST /leads/:id/contacts

Adiciona um contato ao lead. Ao menos `email` ou `phone` deve ser informado.

**Body**

```json
{
  "name": "João Silva",
  "role": "Diretor",
  "email": "joao@empresa.com",
  "phone": "11999999999"
}
```

| Campo   | Tipo   | Obrigatório                            |
| ------- | ------ | -------------------------------------- |
| `name`  | string | sim                                    |
| `role`  | string | sim                                    |
| `email` | string | não — mas email ou phone é obrigatório |
| `phone` | string | não — mas email ou phone é obrigatório |

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

**Resposta 400** — Nem `email` nem `phone` fornecidos

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Lead não encontrado

---

### PATCH /leads/:id/contacts/:contact_id

Atualiza parcialmente um contato. Mantém a constraint email OR phone após o update.

**Body** — qualquer subconjunto de `name`, `role`, `email`, `phone`

**Resposta 200** — Contato atualizado

**Resposta 400** — Update resultaria em ausência de email e phone

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Contato não encontrado ou não pertence ao lead

---

### DELETE /leads/:id/contacts/:contact_id

Remove um contato do lead.

**Resposta 204** — Removido com sucesso

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Contato não encontrado

---

## Leads — Comentários

### POST /leads/:id/comments

Adiciona um comentário ao lead. `user_id` é preenchido automaticamente com o caller.

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

**Resposta 400** — `content` vazio ou ausente

**Resposta 401** — Token ausente

**Resposta 403** — Acesso não autorizado

**Resposta 404** — Lead não encontrado

---

### PATCH /leads/:id/comments/:comment_id

Edita o conteúdo de um comentário. Somente o criador pode editar.

**Body**

```json
{ "content": "Texto corrigido." }
```

**Resposta 200** — Comentário atualizado com `updated_at` preenchido

**Resposta 401** — Token ausente

**Resposta 403** — Caller não é o criador do comentário

**Resposta 404** — Comentário não encontrado

---

### DELETE /leads/:id/comments/:comment_id

Remove um comentário. Permitido para o criador ou para quem tem rank **estritamente maior** que o do criador.

**Resposta 204** — Removido com sucesso

**Resposta 401** — Token ausente

**Resposta 403** — Caller não é o criador nem tem rank superior

**Resposta 404** — Comentário não encontrado

---

## Normas (Estatuto interno)

### GET /norms

Lista todas as normas do estatuto. Qualquer membro autenticado pode consultar.

**Resposta 200** — Array de normas ordenadas por código

```json
[
  {
    "id": "uuid",
    "code": "AN01",
    "description": "...",
    "severity": "leve",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**Resposta 401** — Token ausente

---

### POST /norms

Cria uma nova norma. Restrito a assessor e presidente (rank ≥ 3).

**Body**

```json
{ "code": "AN32", "description": "Descrição da nova norma", "severity": "leve" }
```

Severidades válidas: `leve` · `moderada` · `grave` · `desligamento`

**Resposta 201** — Norma criada

**Resposta 400** — Campo obrigatório ausente ou inválido

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente

**Resposta 409** — Código já existe

---

### PUT /norms/:id

Edita descrição e/ou severidade de uma norma. O campo `code` é ignorado. Restrito a assessor e presidente.

**Body**

```json
{ "description": "Nova descrição", "severity": "moderada" }
```

**Resposta 200** — Norma atualizada

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente

**Resposta 404** — Norma não encontrada

---

### DELETE /norms/:id

Remove permanentemente uma norma. Restrito a assessor e presidente. Falha com 409 se existirem faltas referenciando a norma.

**Resposta 204** — Removida

**Resposta 401** — Token ausente

**Resposta 403** — Rank insuficiente

**Resposta 404** — Norma não encontrada

**Resposta 409** — Existem faltas associadas a essa norma

---

## Faltas (Violations)

Sistema de registro de infrações ao estatuto interno. Pontuação: leve = 1 pt, moderada = 2 pt, grave = 6 pt, desligamento = 18 pt. Score ≥ 18 = risco de desligamento. Faltas expiram após 1 ano.

### GET /violations/me

Retorna as próprias faltas do caller com o placar acumulado. O campo `applied_by` é omitido.

**Resposta 200**

```json
{
  "violations": [
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
      "created_at": "..."
    }
  ],
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

**Resposta 401** — Token ausente

---

### GET /violations

Retorna faltas dos membros visíveis ao caller na hierarquia, sem `applied_by`. Suporta `?user_id=` para filtrar por membro específico.

- Consultor: lista vazia (usar `/violations/me`)
- Gerente: subordinados do mesmo setor
- Diretor VEMKTU (comercial/marketing): subordinados de ambos os setores
- Assessor/Presidente: todos os membros

**Query params:** `user_id` (opcional) — UUID do membro a filtrar

**Resposta 200** — Array de `{ user_id, violations[], summary }`

**Resposta 401** — Token ausente

**Resposta 403** — `user_id` fora da hierarquia do caller

---

### GET /violations/:id

Retorna detalhes completos de uma falta, **incluindo** `applied_by`. Acessível pelo dono da falta ou por superiores hierárquicos.

**Resposta 200** — Objeto de violation com `applied_by` (nullable — `null` para faltas automáticas) e `source` (`"manual"` | `"automatic"`)

**Resposta 401** — Token ausente

**Resposta 403** — Sem autoridade sobre a falta

**Resposta 404** — Falta não encontrada

---

### POST /violations

Aplica uma falta a um membro. Requer rank ≥ 1 (gerente ou superior). O caller deve ter autoridade hierárquica sobre o alvo. Após a criação, um email é enviado ao membro infrator.

**Body**

```json
{
  "user_id": "uuid-do-membro",
  "norm_id": "uuid-da-norma",
  "reason": "Justificativa opcional"
}
```

**Resposta 201** — Falta criada (inclui `applied_by` com UUID do caller e `source: "manual"`)

**Resposta 400** — Campo obrigatório ausente

**Resposta 401** — Token ausente

**Resposta 403** — Sem autoridade hierárquica sobre o alvo

**Resposta 404** — Membro ou norma não encontrado

---

### DELETE /violations/:id

Cancela (soft-delete) uma falta. Faltas canceladas continuam aparecendo com `status: "cancelled"` mas não entram no score.

Autorizado para: o próprio aplicador (`applied_by = caller`) ou quem tem rank > rank do aplicador.

**Resposta 204** — Cancelada

**Resposta 401** — Token ausente

**Resposta 403** — Sem autoridade para cancelar

**Resposta 404** — Falta não encontrada

**Resposta 409** — Falta já cancelada

---

## Jobs Internos (/internal)

Endpoints do namespace `/internal` são para uso exclusivo de automações internas. **Não requerem JWT.** Toda requisição deve incluir o header `X-Internal-Secret` com o valor da env var `INTERNAL_JOB_SECRET`. Requests sem o header ou com valor incorreto retornam 401.

---

### POST /internal/weekly-absence-check

Verifica as horas registradas na semana anterior para todos os usuários ativos e aplica a falta correspondente a quem ficou abaixo de `min_week_hours`. Sem parâmetros de entrada — opera de forma autônoma.

**Regra de seleção de norma:**

- `total_minutes >= min_week_hours * 60` → sem falta
- `total_minutes >= (min_week_hours / 2) * 60` → falta AN07 (leve)
- `total_minutes < (min_week_hours / 2) * 60` → falta AN13 (moderada)

Faltas são inseridas com `source = "automatic"` e `applied_by = null`. Um email é enviado ao membro para cada falta aplicada.

**Idempotência:** se o job já foi executado na semana corrente, retorna 200 com `{ already_ran: true }` sem processar nada.

**Auth:** `X-Internal-Secret: <INTERNAL_JOB_SECRET>`

**Resposta 200 — Execução normal**

```json
{ "week_start": "2026-06-01", "users_checked": 12, "violations_applied": 3 }
```

**Resposta 200 — Já executado esta semana**

```json
{ "already_ran": true }
```

**Resposta 401** — Header ausente ou secret incorreto

---

## Houses (Casas Hogwatts)

### GET /houses

Lista as 3 casas fixas (Lumina, Voltus, Nexus) com a pontuação total de cada uma no ciclo ativo.

**Auth:** Token JWT de usuário autenticado

**Resposta 200**

```json
[
  { "id": "uuid", "name": "Lumina", "total_points": 150 },
  { "id": "uuid", "name": "Voltus", "total_points": 95 },
  { "id": "uuid", "name": "Nexus", "total_points": 210 }
]
```

---

### GET /houses/:id/members

Lista os membros de uma casa específica.

**Auth:** Token JWT de usuário autenticado

**Resposta 200** — Array de usuários com `house_id` igual ao id informado

**Resposta 404** — Casa inexistente

---

### PATCH /houses/members/:user_id

Atribui um usuário a uma casa. Apenas assessores e presidentes.

**Auth:** Token JWT de assessor ou presidente

**Body:**

```json
{ "house_id": "uuid-da-casa" }
```

**Resposta 200** — Usuário atualizado com `house_id`

**Resposta 403** — Papel não autorizado

**Resposta 404** — Usuário ou casa inexistente

---

## Gamification — Ciclos

### GET /gamification/cycles

Lista todos os ciclos em ordem decrescente de `started_at`.

**Auth:** Token JWT de usuário autenticado

---

### GET /gamification/cycles/active

Retorna o ciclo ativo (sem `ended_at`).

**Auth:** Token JWT de usuário autenticado

**Resposta 200**

```json
{
  "id": "uuid",
  "name": "1º Semestre 2026",
  "started_at": "2026-06-04T00:00:00Z",
  "ended_at": null,
  "created_by": "uuid-do-criador",
  "created_at": "2026-06-04T00:00:00Z"
}
```

**Resposta 404** — Nenhum ciclo ativo

---

### POST /gamification/cycles

Cria um novo ciclo. Falha se já houver um ciclo ativo.

**Auth:** Token JWT de assessor ou presidente

**Body:**

```json
{ "name": "1º Semestre 2026" }
```

**Resposta 201** — Ciclo criado

**Resposta 409** — Já existe um ciclo ativo

---

### PATCH /gamification/cycles/:id/close

Encerra o ciclo. Bloqueado se houver submissões pendentes.

**Auth:** Token JWT de assessor ou presidente

**Resposta 200** — Ciclo com `ended_at` preenchido

**Resposta 409** — Submissões pendentes ou ciclo já encerrado

---

## Gamification — Tarefas

### GET /gamification/tasks

Lista as tarefas ativas. Assessores e presidentes podem incluir inativas com `?include_inactive=true`.

**Auth:** Token JWT de usuário autenticado

---

### POST /gamification/tasks

Cria uma nova tarefa. Apenas assessores e presidentes.

**Auth:** Token JWT de assessor ou presidente

**Body:**

```json
{
  "title": "Participar de vídeo do marketing",
  "description": "Aparecer em um vídeo oficial da Watt Consultoria",
  "points": 50
}
```

**Resposta 201** — Tarefa criada com `is_active: true`

---

### PATCH /gamification/tasks/:id

Edita uma tarefa (título, descrição, pontos, ativo/inativo). Apenas assessores e presidentes.

**Auth:** Token JWT de assessor ou presidente

**Body (parcial):**

```json
{ "points": 75, "is_active": false }
```

**Resposta 200** — Tarefa atualizada

**Resposta 404** — Tarefa inexistente

---

## Gamification — Submissões

### POST /gamification/submissions

Submete um comprovante de conclusão de tarefa. O arquivo deve ser enviado previamente ao bucket `gamification-proofs` do Supabase Storage e o caminho informado em `file_path`.

**Auth:** Token JWT de usuário autenticado

**Validações:** usuário com casa atribuída, ciclo ativo existente, tarefa ativa, arquivo no storage.

**Body:**

```json
{
  "task_id": "uuid-da-tarefa",
  "description": "Participei do vídeo em 04/06/2026",
  "file_path": "proofs/uuid-do-usuario/nome-do-arquivo.pdf"
}
```

**Resposta 201** — Submissão criada com `status: "pending"`, `house_id` e `cycle_id` snapshots

**Resposta 400** — Usuário sem casa, sem ciclo ativo, tarefa inativa ou arquivo não encontrado

---

### GET /gamification/submissions

Lista submissões. Usuários comuns veem apenas as próprias; assessores/presidentes podem filtrar com `?status=pending` e/ou `?user_id=uuid`.

**Auth:** Token JWT de usuário autenticado

**Resposta 200** — Array de submissões com `file_url` (signed URL válida por 1h)

---

### PATCH /gamification/submissions/:id/review

Aprova ou rejeita uma submissão pendente. Apenas assessores e presidentes.

**Auth:** Token JWT de assessor ou presidente

**Body:**

```json
{
  "status": "approved",
  "rejection_reason": "opcional — apenas para rejections"
}
```

**Resposta 200** — Submissão atualizada com `reviewed_by` e `reviewed_at`

**Resposta 409** — Submissão já revisada

**Resposta 404** — Submissão inexistente

---

## Gamification — Leaderboard

### GET /gamification/leaderboard

Placar das 3 casas. Por padrão usa o ciclo ativo; aceita `?cycle_id=uuid` para ciclos históricos.

**Auth:** Token JWT de usuário autenticado

**Resposta 200** — Casas ordenadas por `total_points` decrescente

```json
[
  { "house_id": "uuid", "house_name": "Nexus", "total_points": 210 },
  { "house_id": "uuid", "house_name": "Lumina", "total_points": 150 },
  { "house_id": "uuid", "house_name": "Voltus", "total_points": 95 }
]
```

**Resposta 404** — Nenhum ciclo ativo e nenhum `cycle_id` informado

---

### GET /gamification/leaderboard/podium

Pódio individual dos membros de uma casa. Parâmetro `house_id` é obrigatório; `cycle_id` é opcional (padrão: ciclo ativo).

**Auth:** Token JWT de usuário autenticado

**Query:** `?house_id=uuid[&cycle_id=uuid]`

**Resposta 200**

```json
[
  {
    "user_id": "uuid",
    "user_name": "Danilo Silva",
    "points_contributed": 150,
    "approved_count": 3
  },
  {
    "user_id": "uuid",
    "user_name": "Tauan Barros",
    "points_contributed": 60,
    "approved_count": 2
  }
]
```

**Resposta 400** — `house_id` ausente

**Resposta 404** — Nenhum ciclo ativo e `cycle_id` não informado

---

## Processo Seletivo

### `POST /selection-process`

Cria um novo processo seletivo. Rejeita se o range de datas sobrepõe um processo já existente.

**Auth:** `assessor` ou `presidente`

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
  "created_at": "2026-01-15T10:00:00.000Z"
}
```

**Resposta 400** — `ends_at` anterior ou igual a `starts_at`

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 409** — Range sobrepõe processo existente

---

### `PATCH /selection-process/:processId`

Atualiza os dados de um processo seletivo. Todos os campos são opcionais. Se `starts_at` ou `ends_at` forem alterados, a validação de `ends_at > starts_at` e de sobreposição de range é reexecutada.

**Auth:** `assessor` ou `presidente`

**Body** (todos opcionais, pelo menos um obrigatório)

```json
{
  "title": "PS 2026.2",
  "starts_at": "2026-08-01T00:00:00Z",
  "ends_at": "2026-09-01T00:00:00Z"
}
```

**Resposta 200** — Processo atualizado (mesmo shape do POST 201)

**Resposta 400** — Nenhum campo fornecido, ou `ends_at` resultante anterior a `starts_at`

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 404** — Processo não encontrado

**Resposta 409** — Range resultante sobrepõe outro processo existente

---

### `GET /selection-process`

Lista todos os processos seletivos ordenados por `starts_at` decrescente.

**Auth:** Qualquer usuário autenticado

**Resposta 200** — Array de processos (mesmo shape do POST 201)

---

### `POST /selection-process/applications`

**Rota pública** — Submete uma candidatura ao processo seletivo atualmente ativo. O frontend deve fazer upload dos 3 arquivos para o bucket `selection-process-files` (Supabase Storage) antes de chamar este endpoint, e enviar os paths resultantes.

**Auth:** Nenhuma (pública)

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

**Campos:**

- `shirt_size`: enum `P | M | G | GG | XG`
- `period`: inteiro positivo
- `resume_path`, `transcript_path`, `photo_path`: formato `{uuid}/{resume|transcript|photo}.{ext}`

**Resposta 201**

```json
{
  "id": "uuid",
  "created_at": "2026-03-10T14:00:00.000Z"
}
```

**Resposta 400** — Campo ausente, formato de path inválido, ou arquivo não encontrado no Storage

**Resposta 404** — Nenhum processo seletivo ativo no momento

**Resposta 409** — Email já cadastrado neste processo seletivo

---

### `GET /selection-process/applications`

Lista candidaturas. Sem filtro retorna todas. Com `?selection_process_id=uuid` filtra por processo. A resposta inclui URLs assinadas (válidas por 1h) para os 3 arquivos de cada candidatura.

**Auth:** Qualquer usuário autenticado

**Query:** `?selection_process_id=uuid` (opcional)

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
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
    "status": "pending",
    "resume_signed_url": "https://...",
    "transcript_signed_url": "https://...",
    "photo_signed_url": "https://...",
    "created_at": "2026-03-10T14:00:00.000Z"
  }
]
```

**Resposta 404** — `selection_process_id` informado não existe

---

### `PATCH /selection-process/applications/:applicationId`

Atualiza o status de uma candidatura.

**Auth:** `assessor` ou `presidente`

**Body**

```json
{ "status": "approved" }
```

**Campos:**

- `status`: enum `pending | approved | reproved | waitlisted`

**Side-effects:**

- `approved`: cria candidato na etapa 1 do processo (400 se não existirem etapas; 409 se candidato já existir) e envia email de aprovação
- `reproved`: envia email de rejeição ao candidato
- `pending` / `waitlisted`: apenas atualiza o campo, sem side-effects

**Resposta 200** — Candidatura atualizada (mesmo shape do GET applications item)

**Resposta 400** — Status inválido ou processo sem etapas cadastradas

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 404** — Candidatura não encontrada

**Resposta 409** — Candidato já existe para esta candidatura

---

### `POST /selection-process/stages`

Cria uma etapa em um processo seletivo.

**Auth:** `assessor` ou `presidente`

**Body**

```json
{
  "selection_process_id": "uuid",
  "name": "Entrevista",
  "position": 1
}
```

**Campos:**

- `selection_process_id`: UUID do processo (obrigatório)
- `name`: nome da etapa (obrigatório)
- `position`: número inteiro positivo; deve ser único por processo (obrigatório)
- `shift` (opcional, default `false`): quando `true`, todas as etapas com `position >= position` são deslocadas +1 antes de inserir a nova. Útil para inserir uma etapa entre etapas existentes sem conflito.

**Resposta 201**

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "name": "Entrevista",
  "position": 1,
  "created_at": "2026-06-07T10:00:00.000Z"
}
```

**Resposta 400** — Campo ausente ou position ≤ 0

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 404** — Processo não encontrado

**Resposta 409** — Posição já existe neste processo (apenas quando `shift = false`)

---

### `PUT /selection-process/stages/:stageId`

Atualiza nome e/ou posição de uma etapa. Quando a posição alvo já está ocupada por outra etapa do mesmo processo, as posições são trocadas automaticamente (swap atômico).

**Auth:** `assessor` ou `presidente`

**Body** (pelo menos um campo obrigatório)

```json
{ "name": "Entrevista Técnica", "position": 2 }
```

**Comportamento de position:**

- Posição livre → apenas move a etapa
- Posição ocupada por outra etapa → troca as posições das duas etapas atomicamente

**Resposta 200** — Etapa atualizada

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "name": "Entrevista Técnica",
  "position": 2,
  "created_at": "2026-06-07T10:00:00.000Z"
}
```

**Resposta 400** — Nenhum campo fornecido ou position ≤ 0

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 404** — Etapa não encontrada

---

### `GET /selection-process/stages`

Lista etapas de processos seletivos, ordenadas por `position` ascendente.

**Auth:** Obrigatória

**Query params:**

- `selection_process_id` (opcional): filtra por processo

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "name": "Entrevista",
    "position": 1,
    "created_at": "2026-06-07T10:00:00.000Z"
  }
]
```

**Resposta 401** — Sem token

**Resposta 404** — Processo filtrado não encontrado

---

### `GET /selection-process/candidates`

Lista candidatos criados a partir de candidaturas aprovadas.

**Auth:** Obrigatória

**Query params:**

- `selection_process_id` (opcional): filtra por processo
- `stage_id` (opcional): filtra por etapa atual

**Resposta 200**

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
    "created_at": "2026-06-07T10:00:00.000Z"
  }
]
```

**Resposta 401** — Sem token

**Resposta 404** — Processo filtrado não encontrado

---

### `PATCH /selection-process/candidates/:candidateId`

Avança ou elimina um candidato em uma etapa.

**Auth:** `assessor` ou `presidente`

**Body**

```json
{ "status": "approved" }
```

**Campos:**

- `status`: `approved` (avançar/aprovar final) ou `reproved` (eliminar)

**Comportamento:**

- `approved` com próxima etapa: avança `current_stage_id` para position+1, mantém status `active`, envia email de avanço
- `approved` na última etapa: atualiza status para `approved`, envia email de aprovação final
- `reproved`: atualiza status para `eliminated`, envia email de eliminação

**Resposta 200** — Candidato atualizado

```json
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
  "status": "eliminated",
  "created_at": "2026-06-07T10:00:00.000Z"
}
```

**Resposta 400** — Status inválido

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente

**Resposta 404** — Candidato não encontrado

**Resposta 409** — Candidato já finalizado (eliminated ou approved)

---

## Entrevistas PSEL

Sistema de agendamento de entrevistas do processo seletivo. Consultores cadastram horários disponíveis, admins enviam links de agendamento por email aos candidatos, e candidatos agendam via link autenticado por token.

**Modelo:** cada candidato tem exatamente 1 entrevista; cada entrevista é conduzida por **2 consultores** escolhidos aleatoriamente entre os disponíveis no horário.

---

### `POST /selection-process/interviews`

Cadastra lotes de horários disponíveis para o consultor autenticado.

**Auth:** qualquer usuário autenticado (`ANY_AUTH`)

**Body**

```json
{ "slots": ["2027-01-20T14:00:00Z", "2027-01-21T09:00:00Z"] }
```

**Campos:**

- `slots`: array de strings ISO 8601 com offset (mínimo 1 item)

**Validações:**

- Horário deve ser hora fechada (minutos = 0)
- Hora em BRT (UTC-3) deve estar entre 08:00 e 19:00
- Não pode ser no passado
- Slots duplicados para o mesmo consultor são ignorados silenciosamente (`ON CONFLICT DO NOTHING`)

**Resposta 201** — Slots criados (apenas os novos — duplicatas não retornam)

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "consultant_id": "uuid",
    "starts_at": "2027-01-20T14:00:00.000Z",
    "ends_at": "2027-01-20T15:00:00.000Z",
    "booking_id": null,
    "created_at": "2026-06-22T10:00:00.000Z"
  }
]
```

**Resposta 400** — Horário inválido (não é hora fechada, fora do intervalo BRT, ou no passado)

**Resposta 401** — Sem token

**Resposta 404** — Nenhum processo seletivo ativo

---

### `GET /selection-process/interviews`

Lista horários disponíveis para agendamento (uso público, sem auth).

**Auth:** nenhuma

**Regra:** retorna apenas horários com **≥ 2 slots livres** (sem `booking_id`). Horários com apenas 1 consultor disponível não aparecem.

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

### `GET /selection-process/interviews/slots`

Lista os slots do consultor autenticado. Assessores e presidentes veem todos os slots de todos os consultores.

**Auth:** qualquer usuário autenticado (`ANY_AUTH`)

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "selection_process_id": "uuid",
    "consultant_id": "uuid",
    "consultant_name": "Maria Silva",
    "starts_at": "2027-01-20T14:00:00.000Z",
    "ends_at": "2027-01-20T15:00:00.000Z",
    "booking_id": "uuid",
    "candidate_name": "João Costa",
    "candidate_email": "joao@example.com",
    "pair_name": "Carlos Mendes",
    "created_at": "2026-06-22T10:00:00.000Z"
  }
]
```

**Notas:**

- `consultant_name` presente apenas para `assessor` e `presidente`; ausente para outros roles
- `candidate_name` e `candidate_email` presentes apenas em slots com `booking_id`; `null` caso contrário
- `pair_name` presente apenas para consultores comuns (não superusers); contém o nome do outro consultor que compartilha o mesmo booking; `null` se o slot não está agendado ou se não há par

**Resposta 401** — Sem token

---

### `PATCH /selection-process/interviews`

Candidato agenda uma entrevista usando token recebido por email.

**Auth:** nenhuma (autenticação via token no body)

**Body**

```json
{
  "starts_at": "2027-01-20T14:00:00Z",
  "token": "abc123..."
}
```

**Campos:**

- `starts_at`: horário desejado (ISO 8601 com offset)
- `token`: token de agendamento recebido por email

**Comportamento:**

1. Valida token (existe + não expirado) → 401 se inválido
2. Verifica que o candidato ainda não tem entrevista agendada → 409 se já tem
3. Dentro de transação com `FOR UPDATE`: bloqueia os slots livres no horário, verifica que há ≥ 2, sorteia 2 aleatoriamente, cria o booking e associa os 2 slots
4. Envia email de confirmação ao candidato (best-effort)

**Resposta 200**

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "candidate_id": "uuid",
  "starts_at": "2027-01-20T14:00:00.000Z",
  "ends_at": "2027-01-20T15:00:00.000Z",
  "booked_at": "2026-06-22T10:00:00.000Z",
  "created_at": "2026-06-22T10:00:00.000Z"
}
```

**Resposta 400** — Body inválido (falta `token` ou `starts_at`)

**Resposta 401** — Token inexistente ou expirado

**Resposta 409** — Candidato já tem entrevista agendada, ou horário com menos de 2 consultores livres

---

### `POST /selection-process/interviews/send-link`

Envia links de agendamento por email para candidatos selecionados.

**Auth:** `assessor` ou `presidente`

**Body**

```json
{ "candidate_ids": ["uuid-1", "uuid-2"] }
```

**Campos:**

- `candidate_ids`: array de UUIDs de candidatos (mínimo 1)

**Comportamento:**

- Para cada candidato: valida que existe, gera token único (`randomBytes(32).toString('hex')`), salva em `psel_interview_tokens` com `expires_at = processo.ends_at`, envia email com link `{FRONTEND_URL}/psel/entrevistas/{token}`
- Envio de email é best-effort por candidato (falha de email não cancela os demais)

**Resposta 200**

```json
[
  { "candidate_id": "uuid-1", "success": true },
  { "candidate_id": "uuid-2", "success": true }
]
```

**Resposta 400** — `candidate_ids` vazio

**Resposta 401** — Sem token

**Resposta 403** — Role insuficiente (ex: consultor, gerente)

**Resposta 404** — Nenhum processo ativo, ou algum `candidate_id` não existe

### `POST /selection-process/interviews/meet-link`

Envia o link do Google Meet ao candidato por email. Persiste o link no booking para rastreabilidade.

**Auth:** Qualquer usuário autenticado **vinculado ao booking** como consultor (`psel_interview_slots.consultant_id`)

**Body**

```json
{
  "booking_id": "uuid-do-booking",
  "meet_link": "https://meet.google.com/abc-defg-hij"
}
```

**Campos:**

- `booking_id`: UUID do booking da entrevista
- `meet_link`: link do Google Meet — deve seguir o padrão `https://meet.google.com/xxx-xxxx-xxx` (3-4-3 letras minúsculas separadas por hífens)

**Comportamento:**

- Valida que o usuário autenticado é consultor do booking (via `psel_interview_slots`)
- Se o booking já possui `meet_link` preenchido, retorna 409
- Salva o link em `psel_interview_bookings.meet_link`
- Envia email ao candidato com o link (best-effort)

**Resposta 200** — booking atualizado

```json
{
  "id": "uuid",
  "selection_process_id": "uuid",
  "candidate_id": "uuid",
  "starts_at": "2027-01-01T11:00:00.000Z",
  "ends_at": "2027-01-01T12:00:00.000Z",
  "booked_at": "2026-06-22T10:00:00.000Z",
  "meet_link": "https://meet.google.com/abc-defg-hij",
  "created_at": "2026-06-22T10:00:00.000Z"
}
```

**Resposta 400** — `booking_id` ausente ou `meet_link` com formato inválido

**Resposta 401** — Sem token

**Resposta 403** — Usuário não é consultor do booking

**Resposta 404** — Booking inexistente

**Resposta 409** — Booking já possui meet_link

---

### `POST /selection-process/interviews/:bookingId/evaluation`

Registra a avaliação de um candidato após a entrevista. Apenas um dos dois consultores da dupla pode submeter, e a avaliação é imutável após criação.

**Auth:** Qualquer usuário autenticado **vinculado ao booking** como consultor

**Params:**

- `bookingId`: UUID do booking da entrevista

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

Qualidades desejadas (todos obrigatórios, nota inteira de 1 a 5):

- `proatividade`, `lideranca`, `transparencia`, `uniao_de_time`, `comunicacao`, `seriedade`
- `compromisso`, `proposito`, `autoresponsabilidade`, `autoconfianca`, `responsabilidade_social`, `criatividade`

Habilidades indesejadas (todos obrigatórios, booleano — `true` = candidato apresentou o comportamento):

- `procrastinacao`, `desinteresse`, `falta_de_transparencia`, `proposito_vago`, `vitimizacao`, `falta_de_confianca`

Campo opcional:

- `observacoes`: texto livre, nullable

**Comportamento:**

- Valida que o usuário autenticado é consultor do booking (via `psel_interview_slots`)
- Se já existe avaliação para o booking, retorna 409 — a avaliação é única e imutável
- Insere em `psel_interview_evaluations` com `UNIQUE(booking_id)`

**Resposta 201**

```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "evaluator_id": "uuid",
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
  "observacoes": "Candidato demonstrou boa comunicação.",
  "created_at": "2026-06-22T15:00:00.000Z"
}
```

**Resposta 400** — Nota fora do intervalo (< 1 ou > 5) ou campo obrigatório ausente

**Resposta 401** — Sem token

**Resposta 403** — Usuário não é consultor do booking

**Resposta 404** — Booking inexistente

**Resposta 409** — Avaliação já existe para este booking

---

### `GET /selection-process/interviews/evaluations`

Retorna as avaliações de entrevistas. Filtrável por processo seletivo.

**Autenticação:** Obrigatória (qualquer usuário autenticado)

**Query params:**

| Parâmetro              | Tipo | Obrigatório | Descrição                    |
| ---------------------- | ---- | ----------- | ---------------------------- |
| `selection_process_id` | UUID | Não         | Filtra por processo seletivo |

**Resposta 200**

```json
[
  {
    "id": "uuid",
    "booking_id": "uuid",
    "evaluator_id": "uuid",
    "candidate_id": "uuid",
    "candidate_name": "João Silva",
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
    "observacoes": "Candidato demonstrou boa comunicação.",
    "created_at": "2026-06-22T15:00:00.000Z"
  }
]
```

**Resposta 401** — Sem token
