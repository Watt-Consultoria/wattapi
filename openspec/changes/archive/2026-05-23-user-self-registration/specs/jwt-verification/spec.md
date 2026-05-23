## MODIFIED Requirements

### Requirement: JwtGuard como middleware global de enriquecimento
O `JwtGuard` SHALL ser registrado globalmente e executar em todas as requisições. Ele nunca retorna um erro HTTP diretamente. Em vez disso, popula `request.jwtStatus` com uma flag indicando o estado da autenticação, e popula `request.jwtClaims` e `request.user` quando possível.

#### Scenario: Sem Authorization header
- **WHEN** uma requisição chega sem o header `Authorization`
- **THEN** o guard SHALL setar `request.jwtStatus = 'no-token'` e permitir que a requisição prossiga sem `jwtClaims` ou `user`

#### Scenario: Token expirado
- **WHEN** uma requisição chega com um Bearer token cuja assinatura é válida mas que está expirado
- **THEN** o guard SHALL setar `request.jwtStatus = 'token-expired'` e permitir que a requisição prossiga sem `jwtClaims` ou `user`

#### Scenario: Token inválido ou malformado
- **WHEN** uma requisição chega com um Bearer token com assinatura inválida ou formato malformado
- **THEN** o guard SHALL setar `request.jwtStatus = 'token-invalid'` e permitir que a requisição prossiga sem `jwtClaims` ou `user`

#### Scenario: Token válido, usuário não existe em public.users
- **WHEN** uma requisição chega com um Bearer token válido cujo `email` não corresponde a nenhum usuário ativo em `public.users`
- **THEN** o guard SHALL setar `request.jwtStatus = 'user-not-found'`, popular `request.jwtClaims = { sub, email }` e permitir que a requisição prossiga sem `user`

#### Scenario: Token válido, usuário encontrado
- **WHEN** uma requisição chega com um Bearer token válido cujo `email` corresponde a um usuário ativo em `public.users`
- **THEN** o guard SHALL setar `request.jwtStatus = 'ok'`, popular `request.jwtClaims = { sub, email }` e popular `request.user = UserResponse`

### Requirement: Decisões de acesso são responsabilidade exclusiva do RoutePolicyGuard
O JwtGuard SHALL delegar todas as decisões de acesso ao `RoutePolicyGuard`. O `RoutePolicyGuard` lê `request.jwtStatus` e gera respostas de erro contextuais com base no modo de acesso configurado na rota.
