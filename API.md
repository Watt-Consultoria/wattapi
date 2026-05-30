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
  "min_week_hours": 40
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
  "min_week_hours": 44
}
```

| Campo            | Tipo             | Descrição                         |
| ---------------- | ---------------- | --------------------------------- |
| `min_week_hours` | inteiro positivo | Mínimo de horas semanais exigidas |

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

| Campo        | Tipo   | Valores                   | Descrição                                          |
| ------------ | ------ | ------------------------- | -------------------------------------------------- |
| `origin`     | enum   | `automatic`, `directed`   | Origem da notificação                              |
| `created_by` | UUID   | UUID ou `null`            | ID do superusuário que criou; `null` se automática |

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

| Parâmetro | Tipo | Descrição           |
| --------- | ---- | ------------------- |
| `id`      | UUID | ID da notificação   |

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

| Campo              | Tipo   | Obrigatório | Descrição                                              |
| ------------------ | ------ | ----------- | ------------------------------------------------------ |
| `title`            | string | sim         | Mínimo 1 caractere                                     |
| `description`      | string | não         | Texto livre                                            |
| `target`           | objeto | sim         | Filtro de destinatários — ambos os campos opcionais    |
| `target.sector`    | string | não         | Filtra por setor                                       |
| `target.role`      | enum   | não         | Filtra por role: `consultor`, `gerente`, `diretor`, `assessor`, `presidente` |

**Lógica de `target`:**

| target                            | Destinatários                                    |
| --------------------------------- | ------------------------------------------------ |
| `{}`                              | Todos os usuários ativos                         |
| `{ sector: "comercial" }`         | Todos os ativos do setor comercial               |
| `{ role: "diretor" }`             | Todos os diretores ativos                        |
| `{ sector: "comercial", role: "diretor" }` | Diretor(es) do setor comercial          |

**Resposta 201**

```json
{ "count": 5 }
```

**Resposta 400** — Campos inválidos ou `title` ausente

**Resposta 401** — Token ausente ou inválido

**Resposta 403** — Usuário não é superusuário (rank < 3)

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

