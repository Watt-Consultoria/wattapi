## Why

Certas funcionalidades da API dependem de valores de negócio configuráveis — como a quantidade mínima de horas semanais esperada de cada colaborador. Hoje esses valores seriam hardcoded no código, exigindo um novo deploy a cada ajuste. Criar um mecanismo de configurações globais permite que superusuários alterem esses parâmetros em runtime via API, sem intervenção técnica.

## What Changes

- Nova tabela `app_settings` no banco de dados com uma única linha (singleton), colunas fortemente tipadas e constraint que garante no máximo um registro
- Novo módulo `src/modules/settings/` com controller, service e DTOs
- Dois endpoints:
  - `GET /settings` — retorna todas as configurações globais (qualquer usuário autenticado)
  - `PATCH /settings` — atualiza uma ou mais configurações (superusuário, rank >= 3)
- `SettingsService` exposto para injeção em outros módulos, com cache em memória carregado no startup e invalidado a cada `PATCH`
- Configuração inicial: `min_week_hours` (INT, default 40)

## Capabilities

### New Capabilities

- **settings/read**: Qualquer usuário autenticado pode consultar as configurações globais atuais. O response é um objeto plano com todos os campos de `app_settings`.
- **settings/update**: Superusuário (rank >= 3) pode atualizar parcialmente as configurações via `PATCH`. O response devolve o estado completo após a atualização. Validação via Zod no DTO.
- **settings/internal**: `SettingsService` pode ser injetado em qualquer módulo para consumir configurações de forma síncrona via cache em memória, sem custo de I/O por request.

### Modified Capabilities

_Nenhuma. O `min_week_hours` ainda não é consumido por nenhum módulo — isso ocorrerá em changes futuras (ex: validação de horas no time-tracking)._

## Non-Goals

- Histórico de alterações de configurações
- Configurações por usuário ou por grupo
- Interface de administração além dos endpoints REST
- Hot-reload de configurações em módulos que já cacharam o valor (restart é suficiente dado que mudanças são raras)

## Impact

- `src/database/supabase/migrations/` — nova migration criando `app_settings` com seed da linha inicial
- `src/modules/settings/` — novo módulo criado do zero
- `src/app.module.ts` — importação do novo módulo
- Nenhum módulo existente alterado neste change
