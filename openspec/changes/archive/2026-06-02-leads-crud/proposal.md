## Why

O time comercial não tem onde registrar e acompanhar prospects. Sem um CRUD de leads centralizado, oportunidades são gerenciadas em planilhas externas, sem rastreabilidade, histórico de contatos ou visibilidade para a gestão.

## What Changes

- Nova rota `/portfolio` — CRUD de tipos de serviço prestados pela empresa (leitura pública para autenticados, escrita para diretores e superusers)
- Nova rota `/leads` — CRUD de leads comerciais com endereço estruturado, status e portfólio de interesse
- Nova rota `/leads/:id/contacts` — gerenciamento individual (merge) dos contatos de um lead
- Nova rota `/leads/:id/comments` — sistema de comentários com permissões hierárquicas
- **BREAKING** Novo tipo de condição RBA `['roleAndSector', ...]` adicionado ao sistema de políticas de rota

## Capabilities

### New Capabilities

- `portfolio-crud`: CRUD de itens de portfólio (serviços da empresa) acessível para leitura por todos os autenticados e escrita por diretores e superusers
- `leads-crud`: CRUD de leads com endereço estruturado, status, portfólio de interesse, contatos (sub-resource via merge) e comentários com regras hierárquicas de edição e deleção

### Modified Capabilities

- `route-policy`: adição do tipo de condição `['roleAndSector', { roles: string[], sectors: string[] }]` ao conjunto de `RbaCondition` suportadas pelo guard

## Impact

- **Banco de dados**: 4 novas tabelas — `portfolio_items`, `leads` (coluna `interest_items TEXT[]`), `lead_contacts`, `lead_comments`
- **Módulos NestJS**: 2 novos módulos — `portfolio`, `leads`
- **Guard**: `route-policy.guard.ts` e `route-policy.decorator.ts` recebem suporte à nova condição `roleAndSector`
- **API docs**: novas rotas precisam ser documentadas
