## Context

O sistema de notificações atual (tabela `notifications`, módulo NestJS, pg_cron) armazena notificações no banco e o app as busca via `GET /notifications`. Não existe mecanismo de entrega ativa — o usuário só vê notificações ao abrir o app.

O app é uma PWA, o que permite usar a **Web Push API** padrão dos browsers. Esse protocolo é agnóstico de plataforma (Chrome via FCM, Firefox via Mozilla, Safari via APNS-over-WebPush) e não exige SDK nativo instalado no app.

O principal desafio arquitetural é que notificações são criadas por dois caminhos distintos:
- `POST /notifications` → NestJS → INSERT no banco
- pg_cron → INSERT direto no banco (sem passar pelo NestJS)

Qualquer solução de push que resida apenas no NestJS não captura as notificações automáticas do cron. Por isso, a entrega de push deve ser acionada no nível do banco.

## Goals / Non-Goals

**Goals:**
- Entregar Web Push para todos os dispositivos registrados do usuário quando uma notificação é inserida, independente da origem
- Permitir que a PWA registre e remova subscrições de push via API autenticada
- Expirar automaticamente subscrições inválidas (410 Gone)
- Não alterar o fluxo existente de criação de notificações

**Non-Goals:**
- Push para apps nativos (iOS/Android não-PWA)
- Notificações em tempo real além do push (WebSocket, SSE)
- Agendamento ou filas de push (entrega é best-effort, síncrona no webhook)
- Preferências de push por tipo de notificação (mute, filtros)

## Decisions

### 1. Push acionado por Database Webhook + Edge Function (não via NestJS)

**Decisão:** Supabase Database Webhook na tabela `notifications` (evento INSERT) chama a Edge Function `notification-push-trigger`, que executa o envio Web Push.

**Alternativas consideradas:**
- *Chamar push dentro do NotificationsService*: Só capturaria notificações `directed`. Notificações automáticas do pg_cron inserem diretamente no banco e nunca passariam pelo NestJS.
- *Mover o cron para NestJS (`@Cron`)* e centralizar tudo no NestJS: Quebraria a independência do cron em relação ao processo NestJS (requisito atual documentado na spec `notifications-automatic`). Exigiria mudança de escopo significativa.
- *Trigger SQL com `pg_net`*: Tecnicamente equivalente, mas Database Webhook é o padrão recomendado pelo Supabase e não exige gerenciar `pg_net` manualmente.

**Razão:** Webhook captura qualquer INSERT na tabela, independente de quem inseriu. A Edge Function tem acesso direto ao banco Supabase (via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) para buscar as subscrições do usuário.

---

### 2. Protocolo Web Push com VAPID (sem SDK proprietário)

**Decisão:** Usar o pacote `npm:web-push` na Edge Function (Deno com compatibilidade npm).

**Alternativas consideradas:**
- *Firebase Admin SDK (FCM)*: Requer que o app registre tokens FCM, não PushSubscription. Adiciona dependência no Firebase e no frontend. Web Push padrão é mais simples para PWA.
- *Implementar VAPID manualmente via Web Crypto API*: Mais controle, mas complexidade desnecessária quando `web-push` resolve.

**Razão:** `npm:web-push` é a biblioteca de referência para Web Push em Node/Deno. Supabase Edge Functions suportam imports npm. A PWA usa `PushManager.subscribe()` padrão — nenhuma mudança de SDK no frontend.

---

### 3. Subscrições gerenciadas via NestJS (não via Edge Function diretamente)

**Decisão:** `POST /push-subscriptions`, `DELETE /push-subscriptions/:id` e `GET /push-subscriptions/vapid-public-key` são endpoints NestJS normais com autenticação JWT.

**Razão:** O NestJS já possui toda a infraestrutura de autenticação, autorização e validação. Expor esses endpoints via Edge Function exigiria reimplementar auth. O registro de subscrição é uma operação de escrita iniciada pelo usuário, que naturalmente passa pelo NestJS.

---

### 4. Webhook configurado via migration SQL

**Decisão:** O Database Webhook é registrado via migration usando `net.http_post()` ou via a função auxiliar do Supabase (`supabase_functions.http_request()`), não pelo dashboard.

**Razão:** Infraestrutura como código. O webhook precisa ser replicável em ambientes locais (Supabase CLI) e de produção sem intervenção manual.

---

### 5. VAPID keys como secrets (não hardcoded)

**Decisão:** `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` são definidos como secrets do Supabase. O NestJS expõe apenas `VAPID_PUBLIC_KEY` via `GET /push-subscriptions/vapid-public-key` (a chave pública não é sensível).

**Razão:** A chave privada nunca deve ser exposta ao frontend. Gerar as chaves via `web-push generate-vapid-keys` e armazenar nos secrets garante rotação sem mudança de código.

## Risks / Trade-offs

- **Entrega não garantida (best-effort)**: Se a Edge Function falhar (timeout, erro do push service), a notificação existe no banco mas não chega ao dispositivo. Não há fila de retry. → Mitigação: push é complementar à listagem `GET /notifications`; o usuário sempre pode ver as notificações ao abrir o app.

- **Latência do webhook**: O Database Webhook adiciona latência entre o INSERT e o push (tipicamente <500ms no Supabase). → Aceitável para notificações de atividade e avisos de gestores.

- **Subscrições múltiplas por usuário**: Um usuário pode registrar N dispositivos. A Edge Function dispara N requests de push em paralelo. Para usuários com muitos dispositivos, isso pode estourar o timeout da Edge Function. → Mitigação: limite razoável (ex: máximo 5 subscrições por usuário) ou paralelismo controlado.

- **VAPID key rotation**: Rotacionar as chaves VAPID invalida todas as subscrições existentes — todos os usuários precisarão re-aceitar push. → Mitigação: documentar o processo de rotação; não fazer sem necessidade.

- **Ambiente local**: Supabase CLI suporta Edge Functions localmente (`supabase functions serve`), mas o Database Webhook local pode requerer configuração adicional via `pg_net` no container local. → Mitigação: documentar o setup; push pode ser testado manualmente chamando a Edge Function diretamente.

## Migration Plan

1. Gerar VAPID keypair: `npx web-push generate-vapid-keys`
2. Adicionar secrets no Supabase: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`
3. Aplicar migration da tabela `push_subscriptions`
4. Fazer deploy da Edge Function `notification-push-trigger`
5. Aplicar migration do Database Webhook
6. Adicionar `VAPID_PUBLIC_KEY` como env var no NestJS (Railway/AWS)
7. Deploy do NestJS com os novos endpoints

**Rollback:** Desabilitar o webhook via SQL (`DELETE FROM net.http_request_queue` ou dropando o trigger de webhook). Os endpoints NestJS podem ser removidos sem impacto nas notificações existentes.

## Open Questions

- Qual o limite máximo de subscrições por usuário? (sugestão: 5)
- O `GET /push-subscriptions/vapid-public-key` deve ser público (sem JWT) para simplificar o bootstrap do service worker?
