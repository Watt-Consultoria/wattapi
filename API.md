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

| Campo                    | Tipo                   | Descrição                                                                                         |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `min_week_hours`         | inteiro positivo       | Mínimo de horas semanais exigidas no registro de horas                                            |
| `min_availability_hours` | inteiro entre 0 e 98   | Mínimo de slots de disponibilidade que o usuário deve configurar em `PUT /routine`. `0` = desabilitado |

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

| Caller     | Subordinados visíveis               | Restrição de setor |
|------------|-------------------------------------|--------------------|
| Gerente    | consultor                           | mesmo setor        |
| Diretor    | gerente, consultor                  | mesmo setor        |
| Assessor   | diretor, gerente, consultor         | nenhuma            |
| Presidente | diretor, gerente, consultor         | nenhuma            |

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

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `title` | string | sim | Mínimo 1 caractere |
| `description` | string | sim | Mínimo 1 caractere |
| `amount_cents` | integer | sim | Valor em centavos, deve ser positivo |
| `category` | enum | sim | `ingresso`, `alimentação`, `transporte`, `equipamento`, `outro` |
| `pix_key` | string | sim | Chave PIX para recebimento |
| `attachments` | array | **sim** | Array de `{ path, name }` com **mínimo 1 item**; cada `path` deve existir no bucket `reimbursement-receipts` |

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

| Parâmetro | Tipo | Default | Descrição |
| --- | --- | --- | --- |
| `target` | `me` \| `all` | `me` | `me` retorna só os do caller; `all` requer rank ≥ 3 |

**Resposta 200** — Array de reembolsos (mesmo shape do POST 201)

> Cada attachment inclui `signed_url` com validade de 1 hora; o `path` de storage não é exposto.

**Resposta 401** — Token ausente, inválido ou expirado

**Resposta 403** — `target=all` por usuário com rank < 3

---

### `GET /reimbursements/:user_id`

Retorna todas as solicitações de reembolso de um usuário específico. Exclusivo para superusuários.

**Acesso:** autenticado; lógica de acesso verificada no serviço: lança 403 se rank < 3

**Parâmetros de path**

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `user_id` | UUID | ID do usuário alvo |

**Resposta 200** — Array de reembolsos (mesmo shape do POST 201); retorna `[]` se o usuário não tiver reembolsos

**Resposta 401** — Token ausente, inválido ou expirado

**Resposta 403** — Caller com rank < 3

---

### `PATCH /reimbursements/:id/status`

Aprova ou rejeita uma solicitação de reembolso pendente. Status é one-way: uma vez resolvido (`approved` ou `rejected`), não pode ser alterado.

**Acesso:** autenticado; somente Presidente Executivo (rank 4)

**Parâmetros de path**

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | UUID | ID do reembolso |

**Body**

```json
{ "status": "approved" }
```

| Campo | Tipo | Valores |
| --- | --- | --- |
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

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `name` | string | sim — deve ser único |
| `description` | string | não |

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
      { "id": "uuid", "lead_id": "uuid", "name": "João", "role": "Diretor", "email": "joao@abc.com", "phone": null }
    ],
    "comments": [
      { "id": "uuid", "lead_id": "uuid", "user_id": "uuid", "content": "Comentário.", "created_at": "...", "updated_at": "..." }
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

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `company_name` | string | sim |
| `cnpj` | string | sim — formato `XX.XXX.XXX/XXXX-XX` com dígitos verificadores válidos (algoritmo Receita Federal) |
| `address_logradouro` | string | sim |
| `address_numero` | string | sim |
| `address_complemento` | string | não |
| `address_bairro` | string | sim |
| `address_cidade` | string | sim |
| `address_estado` | string | sim |
| `address_cep` | string | sim |
| `status` | enum | não — padrão `nao_contatado` |
| `interest_items` | string[] | não — validado contra `portfolio_items` ativos |

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
    { "id": "uuid", "lead_id": "uuid", "name": "João", "role": "Diretor", "email": "joao@abc.com", "phone": null }
  ],
  "comments": [
    { "id": "uuid", "lead_id": "uuid", "user_id": "uuid", "content": "Comentário.", "created_at": "...", "updated_at": "..." }
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
{ "name": "João Silva", "role": "Diretor", "email": "joao@empresa.com", "phone": "11999999999" }
```

| Campo | Tipo | Obrigatório |
| --- | --- | --- |
| `name` | string | sim |
| `role` | string | sim |
| `email` | string | não — mas email ou phone é obrigatório |
| `phone` | string | não — mas email ou phone é obrigatório |

**Resposta 201**

```json
{ "id": "uuid", "lead_id": "uuid", "name": "João Silva", "role": "Diretor", "email": "joao@empresa.com", "phone": null }
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
{ "id": "uuid", "lead_id": "uuid", "user_id": "uuid", "content": "...", "created_at": "...", "updated_at": "..." }
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
  { "id": "uuid", "code": "AN01", "description": "...", "severity": "leve", "created_at": "...", "updated_at": "..." }
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
      "id": "uuid", "user_id": "uuid",
      "norm": { "id": "uuid", "code": "AN01", "description": "...", "severity": "leve", "points": 1 },
      "reason": null, "status": "active",
      "expires_at": "2027-06-02T00:00:00Z", "cancelled_at": null,
      "applied_at": "2026-06-02T00:00:00Z", "created_at": "..."
    }
  ],
  "summary": { "score": 1, "active_leves": 1, "active_moderadas": 0, "active_graves": 0, "active_desligamentos": 0, "at_risk": false }
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

**Resposta 200** — Objeto de violation com `applied_by`

**Resposta 401** — Token ausente

**Resposta 403** — Sem autoridade sobre a falta

**Resposta 404** — Falta não encontrada

---

### POST /violations

Aplica uma falta a um membro. Requer rank ≥ 1 (gerente ou superior). O caller deve ter autoridade hierárquica sobre o alvo. Após a criação, um email é enviado ao membro infrator.

**Body**

```json
{ "user_id": "uuid-do-membro", "norm_id": "uuid-da-norma", "reason": "Justificativa opcional" }
```

**Resposta 201** — Falta criada (inclui `applied_by`)

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
