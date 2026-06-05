## Why

A Watt Consultoria precisa de um mecanismo de engajamento para seus membros. O sistema Hogwatts divide os membros em três casas (Lumina, Voltus, Nexus) e recompensa participação com pontos por meio de tarefas gamificadas — criando competição saudável e incentivando contribuições mensuráveis ao longo de ciclos definidos por superusers.

## What Changes

- Adiciona coluna `house_id` na tabela `users` (nullable, atribuída por superuser)
- Introduz três entidades novas: **casas**, **ciclos**, **tarefas** e **submissões de gamificação**
- Expõe endpoints REST para gerenciar o ciclo de vida completo: casas, ciclos, tarefas, submissões e placar
- Upload de comprovante segue o padrão existente de Supabase Storage (mesmo fluxo de reimbursements)

## Capabilities

### New Capabilities

- `houses`: Casas fixas (Lumina, Voltus, Nexus) — listagem, placar por ciclo, atribuição de membros
- `gamification-cycles`: Ciclos com início/fim controlados por superuser; apenas um ativo por vez
- `gamification-tasks`: Catálogo de tarefas criadas por superuser com valor em pontos
- `gamification-submissions`: Submissão de comprovante pelo usuário e fluxo de aprovação/rejeição por superuser
- `gamification-leaderboard`: Placar das casas e pódio individual por casa em um ciclo

### Modified Capabilities

- `users`: Adição do campo `house_id` (FK para houses, nullable)

## Impact

- **DB**: 4 novas tabelas (`houses`, `gamification_cycles`, `gamification_tasks`, `gamification_submissions`) + coluna `house_id` em `users`
- **API**: Novos módulos NestJS: `houses`, `gamification/cycles`, `gamification/tasks`, `gamification/submissions`, `gamification/leaderboard`
- **Storage**: Novo bucket `gamification-proofs` no Supabase Storage
- **Seed**: Inserção das 3 casas fixas
