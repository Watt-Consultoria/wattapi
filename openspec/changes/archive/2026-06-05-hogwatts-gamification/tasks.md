## 1. Database — Migrations

- [x] 1.1 Migration: criar tabela `houses` com seed das 3 casas (Lumina, Voltus, Nexus)
- [x] 1.2 Migration: adicionar coluna `house_id` (nullable FK → houses) em `users`
- [x] 1.3 Migration: criar tabela `gamification_cycles` (id, name, started_at, ended_at, created_by)
- [x] 1.4 Migration: criar tabela `gamification_tasks` (id, title, description, points, is_active, created_by, created_at, updated_at)
- [x] 1.5 Migration: criar tabela `gamification_submissions` (id, task_id, user_id, house_id, cycle_id, description, file_path, status, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at)
- [x] 1.6 Criar bucket `gamification-proofs` no Supabase Storage
- [x] 1.7 Atualizar seed de dev: atribuir casas aos usuários existentes

## 2. Testes — Escrever antes da implementação (TDD)

- [x] 2.1 Criar `src/test/houses/GET.spec.ts` — listar casas com e sem ciclo ativo
- [x] 2.2 Criar `src/test/houses/PATCH.spec.ts` — atribuir membro a casa (superuser only)
- [x] 2.3 Criar `src/test/gamification/cycles/POST.spec.ts` — criar ciclo, conflito se já existe ativo
- [x] 2.4 Criar `src/test/gamification/cycles/PATCH.spec.ts` — encerrar ciclo, bloqueio por pendentes
- [x] 2.5 Criar `src/test/gamification/cycles/GET.spec.ts` — ciclo ativo e listagem histórica
- [x] 2.6 Criar `src/test/gamification/tasks/POST.spec.ts` — criar tarefa, validação de pontos
- [x] 2.7 Criar `src/test/gamification/tasks/PATCH.spec.ts` — editar tarefa
- [x] 2.8 Criar `src/test/gamification/tasks/GET.spec.ts` — listar com/sem inativas
- [x] 2.9 Criar `src/test/gamification/submissions/POST.spec.ts` — submeter (sem casa, sem ciclo, arquivo ausente, tarefa inativa, múltiplos submits)
- [x] 2.10 Criar `src/test/gamification/submissions/GET.spec.ts` — usuário vê as suas, superuser filtra por status/user
- [x] 2.11 Criar `src/test/gamification/submissions/PATCH.spec.ts` — aprovar, rejeitar com motivo, já revisada
- [x] 2.12 Criar `src/test/gamification/leaderboard/GET.spec.ts` — placar de casas com e sem ciclo ativo, ciclo histórico
- [x] 2.13 Criar `src/test/gamification/leaderboard/podium/GET.spec.ts` — pódio por casa, house_id obrigatório
- [x] 2.14 Verificar que todos os testes falham (red) antes de iniciar implementação

## 3. HousesModule

- [x] 3.1 Criar `src/modules/houses/houses.module.ts`, `houses.service.ts`, `houses.controller.ts`, `dto/house.dto.ts`
- [x] 3.2 Implementar `GET /houses` — retornar casas com `total_points` do ciclo ativo
- [x] 3.3 Implementar `GET /houses/:id/members` — listar membros de uma casa
- [x] 3.4 Implementar `PATCH /houses/members/:id` — atribuir casa (superuser only)

## 4. GamificationModule — Cycles

- [x] 4.1 Criar estrutura base do `GamificationModule` com sub-controllers
- [x] 4.2 Implementar `POST /gamification/cycles` — criar ciclo, validar unicidade do ativo
- [x] 4.3 Implementar `PATCH /gamification/cycles/:id/close` — encerrar ciclo, validar ausência de pendentes
- [x] 4.4 Implementar `GET /gamification/cycles/active` — retornar ciclo ativo ou 404
- [x] 4.5 Implementar `GET /gamification/cycles` — listar todos os ciclos ordenados por `started_at DESC`

## 5. GamificationModule — Tasks

- [x] 5.1 Implementar `POST /gamification/tasks` — criar tarefa (superuser only)
- [x] 5.2 Implementar `PATCH /gamification/tasks/:id` — editar tarefa (superuser only)
- [x] 5.3 Implementar `GET /gamification/tasks` — listar tarefas; filtrar inativas para usuário comum

## 6. GamificationModule — Submissions

- [x] 6.1 Implementar `POST /gamification/submissions` — submeter comprovante; validar casa, ciclo ativo, tarefa ativa, existência do arquivo no Storage; fazer snapshot de `house_id` e `cycle_id`
- [x] 6.2 Implementar `GET /gamification/submissions` — usuário vê as suas (com signed URL); superuser filtra por `status` e/ou `user_id`
- [x] 6.3 Implementar `PATCH /gamification/submissions/:id/review` — aprovar/rejeitar (superuser only); retornar 409 se já revisada

## 7. GamificationModule — Leaderboard

- [x] 7.1 Implementar `GET /gamification/leaderboard` — placar das casas para ciclo ativo (ou `?cycle_id`); SUM(points) das submissões approved
- [x] 7.2 Implementar `GET /gamification/leaderboard/podium` — ranking individual por casa; `house_id` obrigatório; `?cycle_id` opcional

## 8. Documentação

- [x] 8.1 Atualizar documentação de API para todos os novos endpoints (houses, gamification/*)

## 9. Verificação Final

- [x] 9.1 Rodar `npm test` e garantir que todos os testes passam
- [x] 9.2 Rodar lint e corrigir erros nos arquivos modificados
