## Why

O processo seletivo (PSEL) da Watt precisa de uma etapa de entrevistas entre candidatos e consultores. Hoje não existe mecanismo para consultores declararem disponibilidade nem para candidatos agendarem horários — o processo é manual e descentralizado.

## What Changes

- Qualquer usuário autenticado (qualquer role) pode declarar disponibilidade em slots de 1 hora (08h–20h BRT)
- Entrevistas são conduzidas em dupla: um horário só é exibido ao candidato se houver ao menos 2 consultores disponíveis naquele momento
- Quando o candidato agenda um horário, o sistema sorteia aleatoriamente 2 consultores dentre os disponíveis e os vincula à entrevista
- Admins (assessor/presidente) enviam links de agendamento para candidatos via email
- Candidatos acessam a API pública para ver horários disponíveis e agendar — sem ver os nomes dos consultores
- Após agendamento, candidato recebe email de confirmação com data e hora
- Usuários autenticados podem ver seus próprios slots; assessor/presidente podem ver todos os slots de todos
- Feature completamente desacoplada das etapas (stages) do processo seletivo; entrevistas paralelas são suportadas

## Capabilities

### New Capabilities

- `psel-interview-slots`: Gerenciamento de slots de disponibilidade — criação por qualquer usuário autenticado, listagem pública de horários disponíveis (agregada, sem expor consultores), agendamento via token com sorteio de dupla de consultores, visualização dos próprios slots
- `psel-interview-tokens`: Geração e validação de tokens temporários de agendamento enviados por email aos candidatos

### Modified Capabilities

<!-- Nenhuma spec existente tem seus requisitos alterados -->

## Impact

- **Banco de dados**: 3 novas tabelas (`psel_interview_slots`, `psel_interview_bookings`, `psel_interview_tokens`)
- **Módulo**: `src/modules/selection-process/` — novas rotas adicionadas ao controller/service existente
- **Emails**: 2 novos templates (`InterviewBookingLinkEmail`, `InterviewConfirmationEmail`)
- **Env vars**: `FRONTEND_URL` (já existente no schema) usada para compor o link de agendamento
- **API**: 5 novas rotas sob `/selection-process/interviews`
