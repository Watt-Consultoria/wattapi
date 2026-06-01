## Context

A plataforma tem um sistema de auth bem estabelecido (JWT via Supabase + `RoutePolicyGuard`), padrão de módulos NestJS com `DatabaseService` para queries raw em PostgreSQL, e já usa Supabase Storage para outros fins. O módulo de reembolsos é um novo domínio isolado que reutiliza toda essa infra sem alterá-la.

## Goals / Non-Goals

**Goals:**
- Permitir que qualquer usuário autenticado submeta solicitações de reembolso com comprovantes
- Garantir que comprovantes (arquivos) sejam armazenados de forma privada no Supabase Storage
- Implementar controle de acesso diferenciado: listagem própria vs. listagem global vs. aprovação
- Implementar workflow de status one-way (`pending → approved | rejected`)

**Non-Goals:**
- Notificações automáticas ao submeter ou aprovar reembolsos (pode ser adicionado futuramente via módulo de notifications existente)
- Edição de reembolsos após submission
- Paginação na listagem (fora de escopo inicial)
- Upload de arquivos via backend (frontend faz upload direto ao Supabase Storage)

## Decisions

### D1 — Frontend faz upload direto ao Supabase Storage

**Decisão:** O frontend usa o `supabase-js` para fazer upload diretamente ao bucket privado `reimbursement-receipts`. O backend recebe apenas os storage paths no body do POST.

**Rationale:** Evita que o backend seja proxy de bytes, elimina pressão de memória para arquivos grandes e latência dupla. O ecossistema Supabase foi desenhado para esse padrão.

**Alternativa considerada:** Multipart upload via backend (NestJS recebe o arquivo, faz upload ao Supabase). Descartada por overhead desnecessário.

### D2 — Bucket privado com signed URLs no GET

**Decisão:** Bucket `reimbursement-receipts` é privado. O banco armazena o storage path (ex: `receipts/{userId}/{uuid}/{filename}`), não a URL pública. No GET, o backend gera signed URLs com validade de 1 hora via `supabase.storage.createSignedUrl(path, 3600)`.

**Rationale:** Comprovantes fiscais são documentos sensíveis. URLs públicas permanentes representam risco de vazamento. Signed URLs expiram e só são geradas para usuários com acesso legítimo.

**Trade-off:** Adiciona uma chamada assíncrona ao Supabase por arquivo no GET. Para listagens com muitos anexos, isso pode gerar N chamadas. Aceitável no volume atual.

### D3 — Autorização de GET /reimbursements no service, não no guard

**Decisão:** A rota `GET /reimbursements` usa `@RoutePolicy({ access: { mode: 'authenticated' } })` sem `rba`. A lógica de `target=all` ser exclusiva de superusers é verificada no service.

**Rationale:** O `RoutePolicyGuard` implementa `minRank` com comparação de rank relativo ao `user_id` do path — comportamento correto para operações user-on-user, mas inapropriado aqui onde qualquer superuser deve ver todos os reembolsos independente do rank do dono.

**Para GET /reimbursements/:user_id:** mesmo motivo — o service verifica `isSuperuser(caller.role)` diretamente.

### D4 — PATCH /reimbursements/:id/status usa minRank: 4 no guard

**Decisão:** `@RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 4]] } })`.

**Rationale:** O param é `:id` (UUID do reembolso), não `:user_id`. O guard não tenta comparação de rank com target — apenas verifica `getRank(caller.role) >= 4`. Só Presidente Executivo (rank 4) passa.

### D5 — Status como campo text com CHECK constraint

**Decisão:** Campo `status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))`.

**Rationale:** Consistente com outros campos de estado no projeto. Enum PostgreSQL seria mais rígido mas dificulta migrations futuras. One-way enforced na camada de aplicação (service lança 400 se status já é `approved` ou `rejected`).

### D6 — Categoria como enum PostgreSQL

**Decisão:** `CREATE TYPE reimbursement_category AS ENUM ('ingresso', 'alimentação', 'transporte', 'equipamento', 'outro')`.

**Rationale:** Conjunto fechado e definido pelo negócio. Enum garante integridade no banco sem precisar de tabela de lookup.

## Risks / Trade-offs

- **Arquivos órfãos no Storage** → Se o POST falhar após o upload, os arquivos ficam no bucket sem reembolso associado. Mitigação: aceitável no volume atual; uma job de cleanup periódica pode ser adicionada futuramente.
- **N chamadas para signed URLs** → Em listagens com muitos reembolsos e anexos, o GET pode gerar muitas chamadas ao Supabase Storage. Mitigação: aceitável inicialmente; futuramente pode-se usar `createSignedUrls` (batch) do Supabase.
- **Categoria com acentuação no enum** → `'alimentação'` usa caracter não-ASCII. PostgreSQL suporta isso sem problemas, mas requer atenção no lado do cliente ao enviar o valor.

## Migration Plan

1. Criar migration SQL: enum `reimbursement_category`, tabela `reimbursements`, tabela `reimbursement_attachments`
2. Criar bucket privado `reimbursement-receipts` no Supabase com Storage Policy restrita a usuários autenticados (upload apenas no próprio path `receipts/{userId}/...`)
3. Implementar módulo NestJS (service, controller, DTOs, module)
4. Registrar módulo no `AppModule`

Rollback: dropar as tabelas, remover o enum, deletar o bucket, remover o módulo do AppModule.
