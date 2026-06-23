### Requirement: Consulta de dados públicos de CNPJ com cache

O sistema SHALL expor `GET /leads/cnpj/:cnpj` onde `:cnpj` são exatamente 14 dígitos numéricos sem máscara (ex: `12345678000195`) com dígitos verificadores válidos. A rota SHALL seguir a mesma política de acesso das demais rotas do domínio `/leads`. O sistema SHALL primeiro verificar a tabela `cnpj_cache` usando o CNPJ formatado (com máscara) como chave: se houver registro, SHALL retornar os dados armazenados sem chamar a API externa. Caso contrário, SHALL fazer uma requisição `GET` à ReceitaWS (`https://receitaws.com.br/v1/cnpj/{cnpj}`), armazenar o resultado na tabela `cnpj_cache` e retornar os dados. O corpo de resposta SHALL ser o JSON retornado pela ReceitaWS sem transformação.

#### Scenario: Hit de cache — CNPJ já consultado anteriormente

- **WHEN** `GET /leads/cnpj/12345678000195` e a tabela `cnpj_cache` já contém uma entrada para `12.345.678/0001-95`
- **THEN** o sistema SHALL retornar HTTP 200 com os dados previamente armazenados, sem realizar chamada à ReceitaWS

#### Scenario: Miss de cache — CNPJ consultado pela primeira vez

- **WHEN** `GET /leads/cnpj/12345678000195` e a tabela `cnpj_cache` não contém entrada para esse CNPJ
- **THEN** o sistema SHALL chamar a ReceitaWS, armazenar o resultado em `cnpj_cache` e retornar HTTP 200 com os dados obtidos

#### Scenario: CNPJ com quantidade de dígitos incorreta

- **WHEN** `GET /leads/cnpj/1234567800019` (13 dígitos)
- **THEN** o sistema SHALL retornar HTTP 400 sem chamar a API externa nem consultar o cache

#### Scenario: CNPJ com dígitos verificadores inválidos

- **WHEN** `GET /leads/cnpj/11111111111111` (14 dígitos, mas dígitos verificadores inválidos)
- **THEN** o sistema SHALL retornar HTTP 400 sem chamar a API externa nem consultar o cache

#### Scenario: CNPJ com caracteres não numéricos

- **WHEN** `GET /leads/cnpj/12.345.678%2F0001-95` (CNPJ formatado com máscara na URL)
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: ReceitaWS retorna erro para CNPJ não encontrado ou inativo

- **WHEN** `GET /leads/cnpj/12345678000195` com miss de cache e a ReceitaWS retorna status de erro (HTTP != 200 ou campo `status: "ERROR"`)
- **THEN** o sistema SHALL retornar HTTP 502 e SHALL NOT armazenar nada no cache

#### Scenario: Usuário sem permissão tenta consultar CNPJ

- **WHEN** `GET /leads/cnpj/12345678000195` por caller sem acesso ao domínio leads
- **THEN** o sistema SHALL retornar HTTP 403
