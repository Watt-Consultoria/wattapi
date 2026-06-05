## Context

O sistema atual tem usuários com roles e setores, mas nenhum mecanismo de engajamento. A gamificação Hogwatts adiciona casas, ciclos, tarefas e submissões de comprovantes. O projeto já usa Supabase (Postgres + Storage + Auth) e segue um padrão estabelecido de upload de arquivos via reimbursements.

## Goals / Non-Goals

**Goals:**
- Casas fixas com placar acumulado por ciclo
- Fluxo de submissão de comprovantes com aprovação por superuser
- Histórico de submissões por usuário para pódio individual dentro de cada casa
- Um único ciclo ativo por vez, controlado manualmente por superuser

**Non-Goals:**
- Notificações push/email ao aprovar ou rejeitar submissões
- Gerenciamento automático de ciclos (sem cron de encerramento)
- Pontuação individual por usuário (apenas casa acumula)
- Leaderboard entre ciclos (apenas ciclo atual ou histórico consultado explicitamente)

## Decisions

### 1. Snapshot de `house_id` na submissão

O `house_id` é copiado do usuário **no momento do submit**, não derivado em query time.

**Por quê:** se o superuser reassignar um membro de casa no meio de um ciclo, as submissões antigas não devem mudar de casa retroativamente. O histórico fica imutável.

**Alternativa descartada:** derivar `house_id` via JOIN com `users.house_id` em queries de placar — quebra ao reassignar membros.

---

### 2. `cycle_id` detectado automaticamente no submit

O usuário não especifica o ciclo ao submeter. O backend busca o único ciclo com `ended_at IS NULL` e o associa à submissão.

**Por quê:** simplifica o contrato da API e elimina erros de usuário. Um ciclo ativo por vez é uma invariante do sistema.

**Alternativa descartada:** campo obrigatório `cycle_id` no body — exige que o frontend conheça o ID do ciclo ativo, aumentando acoplamento.

---

### 3. Upload de arquivo segue padrão de reimbursements

Frontend faz upload direto para o Supabase Storage bucket `gamification-proofs`, recebe o path, envia o path no body da submissão. Backend valida a existência do arquivo antes de salvar. Na leitura, gera signed URL com TTL de 1h.

**Por quê:** padrão já validado no projeto, sem custo de aprendizado.

---

### 4. Encerramento de ciclo bloqueado por submissões pendentes

Superuser não pode encerrar um ciclo enquanto houver submissões com `status = 'pending'`. A validação é feita no backend antes do UPDATE.

**Por quê:** decisão do produto — o ciclo só encerra com resultado definitivo para todos.

---

### 5. Estrutura de módulos

- `HousesModule` — controller próprio em `/houses`
- `GamificationModule` — agrupa sub-controllers: `/gamification/cycles`, `/gamification/tasks`, `/gamification/submissions`, `/gamification/leaderboard`

**Por quê:** casas têm semântica própria (e a rota `/houses` é mais limpa para o frontend). Gamificação agrupa as entidades correlacionadas sem poluir o router raiz.

---

### 6. Casas são seed, não CRUD

As 3 casas (Lumina, Voltus, Nexus) são inseridas via migration de seed. Não há endpoint para criar/deletar casas.

**Por quê:** são fixas por definição do produto. CRUD seria complexidade sem valor.

## Risks / Trade-offs

- **Usuário sem casa tenta submeter** → `BadRequestException` com mensagem clara. Superuser deve atribuir casa antes de o membro participar.
- **Nenhum ciclo ativo ao submeter** → `BadRequestException`. Frontend deve exibir estado "sem ciclo ativo".
- **Race condition no encerramento de ciclo** → dois superusers podem tentar fechar o mesmo ciclo simultaneamente. Mitigação: UPDATE com `WHERE ended_at IS NULL` retorna 0 linhas se já fechado — tratar como `NotFoundException`.
- **Signed URLs expiram** → TTL de 1h é suficiente para sessões de review. Comprovantes antigos precisam de novo request para URL válida.

## Migration Plan

1. Migration: criar tabela `houses` + seed das 3 casas
2. Migration: adicionar `house_id` (nullable FK) em `users`
3. Migration: criar tabelas `gamification_cycles`, `gamification_tasks`, `gamification_submissions`
4. Criar bucket `gamification-proofs` no Supabase Storage
5. Implementar módulos NestJS (sem breaking changes nas rotas existentes)
6. Atualizar seed de dev com atribuições de casas para os usuários existentes
