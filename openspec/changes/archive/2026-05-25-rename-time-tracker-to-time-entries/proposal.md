## Why

O prefixo de rota `time-tracking` e o recurso de banco de dados `time_entries` possuem nomes divergentes, quebrando a convenção de que a rota HTTP deve refletir o nome da tabela/recurso. Adicionalmente, o endpoint de summary usa query param (`?user_id`) para identificar o usuário autenticado, enquanto a convenção REST moderna prefere o sufixo `/me` para recursos próprios do usuário.

## What Changes

- **BREAKING** Renomear prefixo de todas as rotas: `POST /time-tracking/clock-in` → `POST /time-entries/clock-in`
- **BREAKING** Renomear prefixo de todas as rotas: `POST /time-tracking/clock-out` → `POST /time-entries/clock-out`
- **BREAKING** Renomear e reestruturar rota de summary: `GET /time-tracking/summary` → `GET /time-entries/summary/me`
- A rota `GET /time-entries/summary/me` retorna sempre o summary do usuário autenticado (sem suporte a `?user_id`)
- Superusuários que precisem consultar summary de outro usuário usarão `GET /time-entries/summary/:userId`

## Capabilities

### New Capabilities

- Nenhuma nova capability introduzida.

### Modified Capabilities

- `time-tracking`: Todos os caminhos de rota mudam de `/time-tracking/...` para `/time-entries/...`; o endpoint de summary é reestruturado de `GET /time-tracking/summary?user_id=<uuid>` para `GET /time-entries/summary/me` (próprio usuário) e `GET /time-entries/summary/:userId` (superusuário).

## Impact

- `src/modules/time-tracking/time-tracking.controller.ts`: alterar decorator `@Controller('time-tracking')` para `@Controller('time-entries')` e renomear `@Get('summary')` para `@Get('summary/me')`, adicionando `@Get('summary/:userId')` para superusuários
- `openspec/specs/time-tracking/spec.md`: atualizar todos os paths de rota para refletir os novos nomes
- Clientes/integrações que consomem as rotas atuais precisarão ser atualizados
