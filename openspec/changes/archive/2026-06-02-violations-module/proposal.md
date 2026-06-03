## Why

A empresa possui um estatuto interno com 31 normas de conduta, mas não há mecanismo sistematizado para registrar, rastrear e comunicar infrações. O controle é feito informalmente, sem histórico auditável, sem notificação automática ao membro e sem visibilidade do acúmulo de faltas ao longo do tempo.

## What Changes

- **Nova tabela `company_norms`**: armazena as 31 normas do estatuto com código (AN01–AN31), descrição e severidade
- **Nova tabela `member_violations`**: registra faltas aplicadas a membros, com expiração automática de 1 ano, cancelamento via soft-delete e rastreamento de quem aplicou
- **Novos endpoints `/norms`**: CRUD de normas (GET público para autenticados; POST/PUT/DELETE restrito a rank >= 3)
- **Novos endpoints `/violations`**: aplicar, listar e cancelar faltas com controle hierárquico de autorização
- **Sistema de pontuação acumulada**: leve=1pt, moderada=2pt, grave=6pt, desligamento=18pt; score >= 18 = risco de desligamento
- **Infraestrutura de email transacional**: novo `EmailModule` com Resend SDK, injetável em qualquer módulo
- **Notificação por email**: ao receber uma falta, o membro é notificado por email com detalhes da norma, pontuação e score acumulado atual

## Capabilities

### New Capabilities

- `norms-crud`: CRUD de normas do estatuto com controle de acesso por rank
- `violations-crud`: Aplicar, listar e cancelar faltas com hierarquia de autorização, expiração e pontuação acumulada
- `email-infrastructure`: EmailModule global com Resend para envio de emails transacionais

### Modified Capabilities

<!-- Nenhuma capability existente tem seus requisitos alterados -->

## Impact

- **Novas migrations**: `create-company-norms-table.sql`, `create-member-violations-table.sql`, `seed-company-norms.sql`
- **Novos módulos NestJS**: `NormsModule`, `ViolationsModule`, `EmailModule`
- **Nova dependência**: `resend` (SDK oficial)
- **Variável de ambiente**: `RESEND_API_KEY`
- **Integração com `role-hierarchy.ts`**: `getVisibleSectors()` e `getRank()` usados no service de violations para validar autorização em tempo de execução
