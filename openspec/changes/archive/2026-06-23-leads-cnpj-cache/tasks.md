## 1. Banco de Dados

- [x] 1.1 Criar migration `supabase migration new create-cnpj-cache` e implementar a SQL que cria a tabela `cnpj_cache` com colunas `cnpj TEXT PRIMARY KEY` (formato com máscara), `data JSONB NOT NULL`, `fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## 2. Testes (TDD — escrever antes da implementação)

- [x] 2.1 Usando o skill `/integration-test`, criar suite `src/test/leads/cnpj.spec.ts` com cenários: hit de cache (seed em `cnpj_cache`, verificar resposta), CNPJ com dígitos errados (400), CNPJ com qtd incorreta (400), role sem acesso (403), sem token (401)
- [x] 2.2 Adicionar `createCnpjCacheEntry({ cnpj, data })` e `DELETE FROM cnpj_cache` no `orchestrator.ts`; confirmar que todos os testes **falham** (red) antes de qualquer implementação

## 3. Implementação

- [x] 3.1 Adicionar `isValidCnpjDigits(digits: string): boolean` e `formatCnpj(digits: string): string` em `src/modules/leads/dto/lead.dto.ts`
- [x] 3.2 Implementar método `lookupCnpj(cnpjDigits: string): Promise<Record<string, unknown>>` no `LeadsService`:
  - Converte dígitos para formato com máscara via `formatCnpj`
  - Consulta `SELECT data FROM cnpj_cache WHERE cnpj = $1` com o CNPJ formatado
  - Se encontrado, retorna `row.data`
  - Se não encontrado, chama `fetch('https://receitaws.com.br/v1/cnpj/{digits}')`, lança `BadGatewayException` se status != 200 ou `json.status === 'ERROR'`, senão faz `INSERT INTO cnpj_cache (cnpj, data) VALUES ($1, $2) ON CONFLICT DO NOTHING` e retorna o JSON
- [x] 3.3 Adicionar handler `GET /leads/cnpj/:cnpj` no `LeadsController`, validando via `isValidCnpjDigits` e delegando ao `leadsService.lookupCnpj`

## 4. Testes

- [x] 4.1 Rodar os testes com `npm test` e confirmar que todos os cenários de `leads/cnpj.spec.ts` passam (green)

## 5. Documentação e Qualidade

- [x] 5.1 Atualizar `API.md` com a nova rota `GET /leads/cnpj/:cnpj`, respostas possíveis (200, 400, 403, 502) e exemplo de resposta da ReceitaWS
- [x] 5.2 Rodar `npm run lint` nos arquivos modificados e confirmar que `npm test` continua passando
