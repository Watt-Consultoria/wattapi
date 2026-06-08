## Context

A API já possui o módulo `reimbursements` que resolve o mesmo problema de upload de arquivos: o frontend faz upload direto no Supabase Storage usando a anon key, envia os paths no body JSON, e o backend valida existência antes de persistir. Esse padrão é o blueprint desta implementação.

O sistema deve suportar múltiplos processos seletivos ao longo do tempo (semestral, anual), cada um com uma janela temporal própria. Candidaturas só são aceitas quando há um processo ativo no momento da submissão.

## Goals / Non-Goals

**Goals:**
- Endpoint público para submissão de candidaturas sem autenticação
- Múltiplos processos seletivos com controle de janela ativa via `starts_at`/`ends_at`
- Upload de arquivos (currículo, histórico, foto) via Supabase Storage com validação de existência
- Bloqueio de email duplicado por processo
- Endpoints autenticados (admin) para gestão de processos e visualização de candidaturas com URLs assinadas

**Non-Goals:**
- Workflow completo de seleção (entrevistas, etapas, feedbacks)
- Notificações por email ao candidato
- Paginação de candidaturas (fora do escopo inicial)

## Decisions

### 1. Upload de arquivos: two-step via Storage direto

**Decisão**: Frontend faz upload para Supabase Storage com anon key; backend recebe apenas os paths e valida existência.

**Alternativas consideradas**:
- Multipart/form-data no backend: mais simples para o cliente, mas o NestJS precisaria processar bytes, complicando validação Zod e aumentando uso de memória.
- Presigned upload URLs: endpoint extra de backend sem benefício real dado que o bucket já restringe inserts via RLS.

**Rationale**: Reusa o padrão do módulo `reimbursements` já em produção. Backend nunca toca bytes.

### 2. Bucket privado com policy de insert anônimo

**Decisão**: Bucket `selection-process-files` com `public = false` e RLS que permite INSERT para `anon` em qualquer path.

**Rationale**: Currículos e históricos escolares são dados pessoais (LGPD). Bucket público exporia URLs acessíveis por qualquer pessoa com o link. O backend gera signed URLs com TTL de 1h para leitura interna, igual ao padrão de reimbursements.

### 3. Processo ativo resolvido pelo backend

**Decisão**: `POST /selection-process/applications` — o backend busca o processo onde `NOW() BETWEEN starts_at AND ends_at`. Frontend não precisa conhecer o ID do processo. Não há endpoint `GET /selection-process/active` exposto — a resolução do processo ativo é interna ao service.

**Alternativa**: Frontend envia `selection_process_id`. Rejeita porque o formulário público não deveria gerenciar qual processo está ativo.

**Edge case**: Se dois processos tiverem ranges sobrepostos, o backend usa o de `starts_at` mais recente. Operacionalmente não deve acontecer.

### 4. Unicidade de email por processo

**Decisão**: UNIQUE constraint em `(selection_process_id, email)`. A mesma pessoa pode candidatar em processos diferentes.

**Rationale**: Impede dupla submissão no mesmo PS sem bloquear futuras edições do processo seletivo.

### 5. Status de candidatura

**Decisão**: Campo `status TEXT NOT NULL DEFAULT 'pending'` com enum: `pending | approved | rejected | waitlisted`.

**Rationale**: Permite workflow básico de triagem sem criar tabelas extras. O PATCH de status fica num endpoint autenticado separado.

### 6. Validação de path de arquivo

**Decisão**: Formato obrigatório `{uuid}/{tipo}.{ext}` validado por regex no Zod, além da verificação de existência no Storage.

**Rationale**: Previne path traversal e garante que arquivos estão organizados por candidatura. Mesmo padrão de segurança que reimbursements, com validação adicional de formato.

## Risks / Trade-offs

- **Arquivos órfãos**: Se o candidato faz upload mas não completa o formulário, arquivos ficam no bucket sem referência no banco. Mitigação: lifecycle policy no bucket (deletar objetos sem referência após 7 dias) — fora do escopo desta entrega, mas documentado.
- **Janelas sobrepostas**: Dois processos ativos ao mesmo tempo resulta em comportamento determinístico (mais recente vence) mas confuso operacionalmente. Mitigação: validação no backend ao criar processo (rejeitar se já existe processo ativo que sobreponha o range).
- **Rate limiting**: Endpoint público sem autenticação pode ser abusado. O Supabase Auth já tem rate limiting na camada de storage. A API em si não tem rate limiting hoje — aceito como risco.

## Migration Plan

1. Criar migration SQL com as duas tabelas
2. Criar bucket `selection-process-files` via migration SQL (Supabase Storage API) ou Supabase Dashboard
3. Configurar RLS: INSERT permitido para `anon`, SELECT/UPDATE/DELETE apenas para `service_role`
4. Deploy do módulo NestJS
5. Rollback: DROP das tabelas, remoção do bucket, remoção do módulo do `app.module.ts`
