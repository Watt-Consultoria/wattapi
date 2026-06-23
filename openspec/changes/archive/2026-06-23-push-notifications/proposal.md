## Why

O sistema de notificações atual armazena notificações no banco e o app as busca ao abrir — não há entrega ativa ao dispositivo. Usuários que não abrem o app ficam sem receber alertas de atividades do dia, notificações dirigidas de gestores e outros eventos relevantes. Como o app é uma PWA, a Web Push API permite entrega nativa nos dispositivos sem depender de SDK proprietário.

## What Changes

- Nova tabela `push_subscriptions` para armazenar subscrições de push por dispositivo/usuário
- `POST /push-subscriptions` — PWA registra sua subscrição ao aceitar notificações
- `DELETE /push-subscriptions/:id` — PWA remove ao desinscrever
- `GET /push-subscriptions/vapid-public-key` — PWA obtém a chave pública VAPID para registrar
- Nova Supabase Edge Function `notification-push-trigger` que envia Web Push via VAPID
- Supabase Database Webhook na tabela `notifications` (evento: INSERT) que invoca a Edge Function
- VAPID keypair configurado como secret no Supabase e variável de ambiente no NestJS

## Capabilities

### New Capabilities

- `push-subscriptions`: Gerenciamento de subscrições de push por dispositivo. Permite que a PWA registre e remova subscrições Web Push associadas ao usuário autenticado, e exponha a chave pública VAPID necessária para o registro.
- `push-delivery`: Entrega automática de Web Push sempre que uma notificação é inserida na tabela `notifications`, independente da origem (automatic ou directed). Implementada via Supabase Database Webhook + Edge Function, sem dependência do processo NestJS.

### Modified Capabilities

## Impact

- **Nova tabela**: `push_subscriptions` com migration
- **Novos endpoints NestJS**: `POST`, `DELETE`, `GET /push-subscriptions`
- **Nova Edge Function Supabase**: `notification-push-trigger` (Deno, `npm:web-push`)
- **Novo Database Webhook**: configurado via migration usando `supabase_functions.http_request()`
- **Dependência nova**: pacote `npm:web-push` na Edge Function (sem alteração no package.json do NestJS)
- **Secrets novos**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` no Supabase; `VAPID_PUBLIC_KEY` como env var no NestJS (para expor ao frontend)
- **Sem breaking changes**: endpoints e modelo de dados de notificações existentes não são alterados
