## Why

Colaboradores precisam submeter despesas para reembolso (ingressos, alimentação, transporte, equipamentos, etc.) e a empresa precisa de um fluxo para revisar e aprovar essas solicitações. Atualmente não há nenhum mecanismo para isso na plataforma.

## What Changes

- Nova tabela `reimbursements` com campos: título, descrição, valor em centavos, categoria (enum), chave PIX, status e `user_id`
- Nova tabela `reimbursement_attachments` para armazenar paths dos comprovantes no Supabase Storage (bucket privado)
- Novo módulo NestJS `reimbursements` com controller, service e DTOs
- Novo bucket privado no Supabase Storage (`reimbursement-receipts`)
- `POST /reimbursements` — qualquer usuário autenticado pode submeter uma solicitação
- `GET /reimbursements?target=me|all` — usuários veem as próprias; superusers podem ver todas
- `GET /reimbursements/:user_id` — somente superusers podem ver reembolsos de um usuário específico
- `PATCH /reimbursements/:id/status` — somente Presidente Executivo (rank 4) pode aprovar ou rejeitar

## Capabilities

### New Capabilities

- `reimbursements-crud`: Criação e listagem de solicitações de reembolso com suporte a comprovantes (arquivos privados via Supabase Storage com signed URLs)
- `reimbursements-status`: Workflow de aprovação one-way: `pending → approved | rejected`, restrito ao Presidente Executivo

### Modified Capabilities

## Impact

- **Banco de dados:** 2 novas tabelas + 1 enum PostgreSQL (`reimbursement_category`)
- **Supabase Storage:** novo bucket privado `reimbursement-receipts`; frontend faz upload direto, backend gera signed URLs no GET
- **API:** 4 novas rotas sob `/reimbursements`
- **Auth:** reutiliza `RoutePolicyGuard` e `isSuperuser` existentes; lógica de acesso a `GET /:user_id` e `GET ?target=all` aplicada no service
