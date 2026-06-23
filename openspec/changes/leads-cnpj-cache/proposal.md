## Why

A criação de leads exige CNPJ, mas o preenchimento manual de dados da empresa é lento e propenso a erro. A ReceitaWS oferece uma API pública que retorna dados completos de uma empresa a partir do CNPJ — porém sua versão gratuita é limitada a 3 requisições por minuto. Precisamos expor essa consulta internamente com cache persistente para eliminar chamadas redundantes e respeitar o rate limit.

## What Changes

- Nova rota `GET /leads/cnpj/:cnpj` onde `:cnpj` são os 14 dígitos sem máscara (ex: `12345678000195`) que retorna os dados públicos da empresa
- Nova tabela `cnpj_cache` para armazenar resultados de consultas anteriores à ReceitaWS
- Novo service/client HTTP que integra com a API ReceitaWS (versão gratuita)
- A rota segue a mesma política de acesso das rotas `/leads` existentes

## Capabilities

### New Capabilities

- `cnpj-lookup`: Endpoint `GET /leads/cnpj/:cnpj` (14 dígitos no path param) que verifica o cache local antes de consultar a API ReceitaWS, armazena o resultado e retorna os dados da empresa

### Modified Capabilities

- `leads-crud`: Nenhuma mudança de requisito de negócio — o acesso a `/leads/cnpj/:cnpj` reutiliza a mesma política RBA já definida para o domínio `/leads`

## Impact

- **API**: nova rota `GET /leads/cnpj/:cnpj`
- **Banco de dados**: nova tabela `cnpj_cache` com migração Supabase
- **Dependência externa**: `https://receitaws.com.br/v1/cnpj/{cnpj}` (GET, sem autenticação, rate limit 3 req/min no plano gratuito)
- **Código**: novo handler no controller de leads, método no service e HTTP client para a ReceitaWS
