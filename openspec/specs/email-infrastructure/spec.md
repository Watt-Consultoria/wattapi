### Requirement: EmailModule global com Resend
O sistema SHALL expor um `EmailModule` marcado como `@Global()` que registra um `EmailService` usando o Resend SDK. A API key SHALL ser lida da variável de ambiente `RESEND_API_KEY`. O módulo SHALL ser importado no `AppModule` e disponível para injeção em qualquer módulo sem importação explícita.

#### Scenario: EmailService injetável sem import explícito
- **WHEN** `EmailModule` está registrado no `AppModule` como global
- **THEN** qualquer service pode injetar `EmailService` sem importar `EmailModule` diretamente

#### Scenario: RESEND_API_KEY ausente — comportamento no-op
- **WHEN** `RESEND_API_KEY` não está definida no ambiente
- **THEN** o `EmailService` SHALL logar um warning e retornar sem lançar exceção em qualquer tentativa de envio

### Requirement: Envio de email de notificação de falta
O `EmailService` SHALL expor um método `sendViolationNotification(payload)` que envia um email ao membro infrator com os detalhes da falta. O email SHALL omitir o campo `applied_by` por política de privacidade.

Conteúdo obrigatório do email:
- Nome do membro
- Código da norma (ex: `AN01`) e descrição completa
- Severidade da norma
- Pontuação da falta (ex: `2 pontos`)
- Reason (se fornecido)
- Data de expiração da falta (`expires_at`)
- Score acumulado atual do membro (após inclusão da nova falta)
- Indicação de risco de desligamento (`at_risk = true` quando score >= 18)

#### Scenario: Email enviado com dados corretos
- **WHEN** `sendViolationNotification` é chamado com payload válido
- **THEN** o Resend envia um email para o endereço do membro com todos os campos obrigatórios

#### Scenario: Falha no envio não propaga exceção
- **WHEN** o Resend retorna erro (ex: rate limit, API key inválida)
- **THEN** o `EmailService` SHALL logar o erro mas NÃO lançar exceção (não cancela a criação da violation)

#### Scenario: Email não enviado para membro inativo
- **WHEN** o membro alvo não tem email registrado
- **THEN** o `EmailService` SHALL logar um warning e retornar sem tentar envio

### Requirement: Variável de ambiente RESEND_API_KEY
O sistema SHALL requerer a variável `RESEND_API_KEY` para o envio de emails em produção. Em desenvolvimento e testes, a ausência da variável SHALL resultar em comportamento no-op (nenhum email enviado, sem erro).

#### Scenario: Produção com key configurada envia email
- **WHEN** `RESEND_API_KEY` está definida e válida
- **THEN** emails são enviados via Resend API

#### Scenario: Desenvolvimento sem key não quebra a aplicação
- **WHEN** `RESEND_API_KEY` não está definida
- **THEN** a aplicação inicia normalmente e chamadas ao `EmailService` retornam silenciosamente

### Requirement: Modo de email para desenvolvimento com Resend sandbox
Em ambiente de desenvolvimento, o `EmailService` SHALL suportar um modo sandbox onde emails são capturados pelo dashboard do Resend sem serem entregues a destinatários reais. Isso é controlado pela variável de ambiente `EMAIL_DEV_REDIRECT`: quando definida com um endereço de email, todos os envios redirecionam para esse endereço (útil para inspecionar o conteúdo real do email). Quando `NODE_ENV=development` e `EMAIL_DEV_REDIRECT` não está definida, o `EmailService` SHALL logar o conteúdo do email no console em vez de enviar.

#### Scenario: EMAIL_DEV_REDIRECT definido — redireciona destinatário
- **WHEN** `EMAIL_DEV_REDIRECT=dev@example.com` está definido
- **THEN** o email é enviado para `dev@example.com` independente do destinatário original, e o destinatário original é incluído no subject para rastreamento

#### Scenario: Development sem EMAIL_DEV_REDIRECT — log no console
- **WHEN** `NODE_ENV=development` e `EMAIL_DEV_REDIRECT` não está definido
- **THEN** o `EmailService` loga o payload completo do email (destinatário, subject, body) no console e NÃO chama o Resend API

#### Scenario: Produção ignora EMAIL_DEV_REDIRECT
- **WHEN** `NODE_ENV=production`
- **THEN** o email é sempre enviado ao destinatário real, independente de `EMAIL_DEV_REDIRECT`
