## Why

Administradores do processo seletivo precisam enviar comunicados personalizados (HTML + texto plano) para grupos de candidatos selecionados manualmente, sem depender de templates fixos. A rota atual não oferece esse nível de flexibilidade.

## What Changes

- Nova rota `POST /selection-process/send-email` que recebe uma lista de IDs de candidatos, um corpo HTML e um corpo em texto plano, envia o email para cada candidato e retorna o número de envios bem-sucedidos e com erro.

## Capabilities

### New Capabilities

- `psel-send-email`: Envio de email avulso e personalizável para um conjunto de candidatos do processo seletivo, com resultado agregado (sucessos / erros).

### Modified Capabilities

<!-- Nenhuma especificação existente tem seus requisitos alterados por esta mudança. -->

## Impact

- **API**: nova rota `POST /selection-process/send-email` (acesso restrito a `assessor` / `presidente`)
- **Código**: `SelectionProcessController`, `SelectionProcessService`, DTOs em `selection-process.dto.ts`
- **Dependências**: `EmailService` (já existente)
- **Banco de dados**: nenhuma alteração de schema necessária
