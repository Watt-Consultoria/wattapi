## Why

O campo CNPJ é obrigatório para identificar juridicamente uma empresa no contexto brasileiro, sendo essencial para a qualificação de leads comerciais. A ausência deste campo impede a equipe comercial de registrar dados completos de prospecção e compromete relatórios fiscais e de compliance.

## What Changes

- **Novo campo obrigatório `cnpj`** na tabela `leads` (VARCHAR(18), formato `XX.XXX.XXX/XXXX-XX`)
- **Migration SQL** para adicionar a coluna `cnpj NOT NULL` à tabela existente
- **Validação de formato CNPJ** no backend (Kotlin) ao criar e atualizar leads
- **Atualização dos testes de integração** da rota `/leads` para incluir o campo `cnpj` nos payloads
- **Melhoria da documentação OpenAPI/Swagger** das rotas `/leads` e `/portfolio` com descrições, exemplos e schemas completos
- **Atualização da spec** `leads-crud` para incluir o requisito do campo CNPJ

## Capabilities

### New Capabilities
- Nenhuma nova capability independente

### Modified Capabilities
- `leads-crud`: Adicionar requisito do campo `cnpj` obrigatório na criação e atualização de leads, com validação de formato CNPJ brasileiro

## Impact

- **Banco de dados**: Migration na tabela `leads` — requer valor default ou backfill para registros existentes
- **API**: `POST /leads` e `PATCH /leads/:id` passam a exigir/aceitar `cnpj`; `GET /leads` e `GET /leads/:id` passam a retornar `cnpj`
- **Testes de integração**: Todos os cenários que criam leads precisam incluir `cnpj` válido no payload
- **Documentação**: Rotas `/leads` e `/portfolio` terão documentação OpenAPI aprimorada
