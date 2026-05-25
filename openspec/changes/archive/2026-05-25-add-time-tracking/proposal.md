## Why

Todos os colaboradores da Watt precisam registrar suas horas de trabalho semanais. Hoje não existe nenhum mecanismo para isso na API — o controle é manual e descentralizado. Adicionar time tracking à API permite que o frontend exiba o ponto eletrônico de cada usuário, com feedback imediato sobre sessões em aberto e totais semanais.

## What Changes

- Criação da tabela `time_entries` no banco de dados com suporte a múltiplas sessões por dia, detecção de sessão aberta e anulação de sessões inválidas com motivo registrado
- Novo módulo `src/modules/time-tracking/` com controller, service e DTOs
- Três endpoints:
  - `POST /time-tracking/clock-in` — inicia uma sessão de trabalho
  - `POST /time-tracking/clock-out` — encerra a sessão aberta (válida ou anulada com motivo)
  - `GET /time-tracking/summary` — retorna sessões válidas da semana + estado da sessão atual
- Acesso ao summary de outros usuários restrito a superusuários (rank >= 3)

## Capabilities

### New Capabilities

- **time-tracking/clock-in**: Usuário autenticado inicia uma sessão de trabalho. Rejeita se já existe sessão aberta.
- **time-tracking/clock-out**: Encerra a sessão aberta. Se a duração exceder 8 horas, a sessão é fechada e marcada como anulada (`is_valid = FALSE`) com `annulled_reason = 'exceeded_max_duration'`. O response informa o status e o motivo.
- **time-tracking/summary**: Retorna o resumo semanal (segunda a domingo) com todas as sessões válidas e o estado da sessão atual em três variantes: `none`, `open`, ou `invalid` (sessão aberta há mais de 8h, ainda não fechada).

### Modified Capabilities

_Nenhuma._

## Non-Goals

- Edição manual de registros de ponto
- Aprovação ou revisão de registros por gestores
- Relatórios históricos além da semana corrente
- Notificações automáticas de sessão inválida

## Impact

- `src/database/supabase/migrations/` — nova migration criando `time_entries`
- `src/modules/time-tracking/` — novo módulo criado do zero
- `src/app.module.ts` — importação do novo módulo
- Nenhum módulo existente alterado
