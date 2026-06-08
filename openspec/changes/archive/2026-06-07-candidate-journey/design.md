## Context

O módulo `selection-process` já gerencia processos seletivos e candidaturas. O `SelectionProcessService` já tem `EmailService` injetado e já usa o padrão de side-effects no `createApplication` (envia email de confirmação após inserir). O padrão estabelecido é: operação principal → side-effect de email em bloco try/catch separado.

As tabelas existentes são `selection_processes` e `selection_process_applications`. As novas tabelas (`selection_process_stages` e `candidates`) expandem o modelo sem modificar o existente.

## Goals / Non-Goals

**Goals:**
- Criar endpoints de gerenciamento de etapas dentro de um processo seletivo
- Ao aprovar uma candidatura, criar automaticamente um candidato na etapa 1 e enviar email
- Ao reprovar uma candidatura, enviar email de rejeição
- Ao aprovar um candidato em uma etapa, avançá-lo automaticamente para a próxima e enviar email
- Ao reprovar um candidato em uma etapa, eliminá-lo e enviar email
- Ao aprovar na última etapa, marcar o candidato como aprovado final e enviar email distinto

**Non-Goals:**
- Histórico de etapas percorridas por um candidato (apenas etapa atual)
- Edição manual da etapa atual sem passar pelo fluxo de aprovação/reprovação
- Notificações push ou WhatsApp
- Criação de etapas padrão automáticas ao criar um processo seletivo

## Decisions

### 1. Candidato como snapshot da candidatura

Ao criar o candidato, os campos relevantes (`name`, `course`, `period`, `phone`, `email`, `shirt_size`) são copiados da candidatura. O candidato mantém `application_id` como FK para rastreabilidade, mas os dados ficam denormalizados.

**Por quê:** Evita que mudanças futuras na candidatura (ex: correção de dados) afetem o candidato já em andamento. O candidato é um contrato firmado no momento da aprovação.

**Alternativa descartada:** Ler sempre da candidatura via JOIN — acoplamento desnecessário; se a candidatura for deletada, o candidato perde dados.

### 2. Avanço automático por posição (position + 1)

O PATCH de candidato não recebe `next_stage_id`. O sistema busca a etapa com `position = current_position + 1` no mesmo processo.

**Por quê:** Fluxo sempre linear, mais simples de implementar e de entender. O usuário confirmou essa decisão na fase de exploração.

**Alternativa descartada:** Especificar etapa destino no payload — flexibilidade desnecessária para o fluxo atual.

### 3. `current_stage_id NOT NULL` na tabela candidates

Todo candidato sempre tem uma etapa. Se não existir etapa com `position = 1` no processo ao tentar aprovar uma candidatura, o sistema retorna `400 Bad Request`.

**Por quê:** Consistência de dados — candidato sem etapa é um estado inválido no modelo de negócio.

### 4. Status do candidato como enum tri-estado

`active` (em andamento) | `eliminated` (reprovado em alguma etapa) | `approved` (passou todas as etapas).

**Por quê:** Permite listar candidatos por status sem precisar saber em qual etapa pararam.

### 5. Emails em bloco try/catch separado

Mesma abordagem do `createApplication` existente: se o email falhar, a operação principal já foi commitada. O erro de email não reverte a transação.

**Por quê:** Consistência com o padrão já estabelecido no módulo. Email é best-effort — melhor ter o candidato criado sem email do que rollback completo por falha de SMTP.

### 6. Isolamento em `SelectionProcessService`

Toda a lógica de stages e candidates fica no `SelectionProcessService` existente, sem criar um service novo.

**Por quê:** O módulo é coeso e as entidades são fortemente acopladas (stages pertencem a processos, candidates pertencem a processos e stages). Um service separado adicionaria complexidade de injeção sem benefício.

## Risks / Trade-offs

- **Etapa 1 inexistente no momento da aprovação** → Retorna 400. Operacionalmente, os admins devem criar etapas antes de aprovar candidaturas. Documentar no erro.
- **Aprovação duplicada de candidatura** → `application_id` é UNIQUE em `candidates`, então um segundo approve retorna 409 do banco. O service deve tratar esse código de erro explicitamente.
- **Candidato já eliminado/aprovado recebe novo PATCH** → O service deve verificar `status != 'active'` e retornar 409/400 antes de processar o avanço.
- **Email falha ao criar candidato** → Candidato existe no banco mas candidato não sabe. Risco aceitável dado o padrão já estabelecido; monitorar logs.

## Migration Plan

1. Rodar migração `selection_process_stages` antes de `candidates` (FK dependency)
2. Não há dados existentes em `candidates` (tabela nova)
3. Aplicações existentes com `status = 'approved'` não terão candidato correspondente — isso é aceitável pois o status aprovado manual foi feito antes desse fluxo existir
4. Rollback: DROP TABLE candidates CASCADE, DROP TABLE selection_process_stages CASCADE (sem impacto em tabelas existentes)
