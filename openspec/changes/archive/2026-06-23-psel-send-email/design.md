## Context

O `SelectionProcessService` já possui infraestrutura de email via `EmailService`. A rota nova segue o mesmo padrão de acesso das rotas administrativas existentes (`assessor` / `presidente`). Não há mudança de schema de banco — os emails dos candidatos já estão na tabela `candidates`.

## Goals / Non-Goals

**Goals:**
- Expor `POST /selection-process/send-email` com corpo `{ candidate_ids, html, plain_text, subject }`.
- Buscar o email de cada candidato pelo ID e disparar o envio.
- Retornar `{ successes: number, errors: number }` com o resultado agregado.
- Acesso restrito a `assessor` e `presidente`.

**Non-Goals:**
- Não cria templates reutilizáveis nem persiste histórico de envios.
- Não valida o conteúdo HTML (responsabilidade do chamador).
- Não enfileira ou agenda envios — é síncrono (fire-and-settle com `Promise.allSettled`).

## Decisions

### 1. Envio paralelo com `Promise.allSettled`
Enviar todos os emails em paralelo em vez de sequencial. Razão: reduz latência total; um erro de envio individual não deve interromper os demais. `Promise.allSettled` garante que todos os resultados (fulfilled/rejected) sejam coletados antes de retornar.

**Alternativa descartada**: loop sequencial — mais lento e um erro interromperia os envios seguintes.

### 2. Resposta agregada sem detalhes por candidato
Retornar apenas `{ successes, errors }`. Razão: suficiente para o caso de uso e não expõe emails de candidatos na resposta. Caso futuramente seja necessário saber quais IDs falharam, o campo pode ser expandido sem breaking change.

### 3. Validação dos IDs no service (não no banco via FK)
Buscar todos os candidatos pelos IDs fornecidos e lançar `NotFoundException` se algum ID não existir. Razão: mensagem de erro explícita antes de tentar enviar qualquer email.

## Risks / Trade-offs

- **Timeout de resposta HTTP em listas grandes** → Mitigação: sem limite imposto na V1; se necessário, limitar via validação Zod (`max(100)`).
- **Falha parcial silenciosa** → Mitigação: o campo `errors` no retorno informa o chamador; logs de erro já são gerados pelo `EmailService`.
