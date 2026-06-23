## ADDED Requirements

### Requirement: Envio do link do Google Meet ao candidato
Um consultor vinculado a um booking pode enviar o link do Google Meet ao candidato por email. O link é validado por regex antes do envio e persistido no booking. Somente um envio é permitido por booking.

#### Scenario: Envio bem-sucedido
- **WHEN** um consultor vinculado ao booking envia um link válido do Google Meet
- **THEN** o sistema salva o link em `psel_interview_bookings.meet_link`, envia email ao candidato com o link e retorna 200 com os dados do booking atualizado

#### Scenario: Link com formato inválido
- **WHEN** o consultor envia um link que não segue o padrão `https://meet.google.com/xxx-xxxx-xxx`
- **THEN** o sistema retorna 400

#### Scenario: Link já enviado anteriormente
- **WHEN** o consultor tenta enviar um link para um booking que já possui `meet_link` preenchido
- **THEN** o sistema retorna 409

#### Scenario: Usuário não vinculado ao booking
- **WHEN** um usuário autenticado que não é consultor daquele booking tenta enviar o link
- **THEN** o sistema retorna 403

#### Scenario: Booking inexistente
- **WHEN** o consultor informa um `booking_id` que não existe
- **THEN** o sistema retorna 404

#### Scenario: Requisição sem autenticação
- **WHEN** a rota é chamada sem token de autenticação
- **THEN** o sistema retorna 401
