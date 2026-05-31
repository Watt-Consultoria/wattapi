## Why

A empresa opera com horário flexível, tornando essencial mapear a disponibilidade semanal de cada contribuinte para viabilizar agendamentos e coordenação entre equipes. Atualmente não existe nenhum mecanismo centralizado para registrar e consultar esses dados.

## What Changes

- Novo endpoint `PUT /routine` — salva ou atualiza a rotina semanal do próprio usuário
- Novo endpoint `GET /routine` — retorna a rotina semanal do próprio usuário (null se não definida)
- Novo endpoint `GET /routine/:userId` — retorna a rotina de outro usuário, sujeito a visibilidade hierárquica
- Novo endpoint `GET /routine/summary` — retorna, por slot da semana, quais subordinados estão disponíveis (restrito a gerentes e superiores)
- A rotina é modelada como slots semanais fixos (Segunda–Domingo, 08h–22h, granularidade de 1 hora = 14 slots × 7 dias = 98 slots por usuário)
- A disponibilidade é estática (não varia semana a semana) mas pode ser atualizada a qualquer momento
- Nova tabela `routine_slots` no banco de dados

## Capabilities

### New Capabilities
- `routine-management`: CRUD da rotina semanal de disponibilidade por usuário, com controle de acesso hierárquico para leitura por superiores
- `routine-summary`: sumário de disponibilidade dos subordinados agregado por slot da semana, acessível apenas a gerentes e superiores

### Modified Capabilities

## Impact

- **Banco de dados**: nova tabela `routine_slots (user_id, day, hour)` — apenas slots disponíveis são armazenados; write via DELETE + INSERT em transação
- **API**: 4 novos endpoints REST sob o módulo `routine`
- **Auth/RBAC**: visibilidade hierárquica de leitura combinando rank e setor (lógica no service, não no guard)
- **Módulos afetados**: novo módulo `routine`; leitura de `role` e `sector` do módulo `users`
