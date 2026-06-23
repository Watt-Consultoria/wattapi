## Why

O fluxo de entrevistas do PSEL está implementado até o agendamento — candidato agenda, consultores recebem notificação — mas faltam as duas etapas finais: envio do link da chamada online e avaliação do candidato após a entrevista. Sem essas rotas, a entrevista acontece fora do sistema e o resultado não é registrado.

## What Changes

- Entrevistadores vinculados a um booking podem enviar o link do Google Meet ao candidato por email
- O link do Meet é persistido em `psel_interview_bookings` para rastreabilidade
- Entrevistadores vinculados a um booking podem submeter uma avaliação do candidato composta por 12 qualidades desejadas (nota 1–5), 6 habilidades indesejadas (booleano) e observações livres
- A avaliação é única e imutável por entrevista (uma por booking)

## Capabilities

### New Capabilities

- `psel-interview-meet-link`: Envio do link do Google Meet ao candidato por um dos consultores da dupla; persiste o link no booking
- `psel-interview-evaluation`: Submissão de avaliação estruturada do candidato (12 qualidades 1–5, 6 habilidades indesejadas booleanas, observações opcionais) por um dos consultores da dupla; imutável após criação

### Modified Capabilities

<!-- Nenhuma spec existente tem seus requisitos alterados -->

## Impact

- **Banco de dados**: `ALTER TABLE psel_interview_bookings ADD COLUMN meet_link TEXT`; nova tabela `psel_interview_evaluations`
- **Módulo**: `src/modules/selection-process/` — novas rotas no controller/service existente
- **Email**: novo template `InterviewMeetLinkEmail.ts`
- **API**: 2 novas rotas sob `/selection-process/interviews`
