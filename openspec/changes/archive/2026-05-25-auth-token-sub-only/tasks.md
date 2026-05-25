## 1. Testes (RED)

- [x] 1.1 Escrever teste: `JwtGuard` deve retornar `token-invalid` quando `sub` não é UUID válido
- [x] 1.2 Escrever teste: `JwtGuard` deve resolver usuário por `id` (não por email)
- [x] 1.3 Escrever teste: `JwtGuard` deve popular `jwtData` apenas com `{ sub }` (sem `email`)
- [x] 1.4 Escrever teste: `UsersController.create` não deve ter lógica de validação UUID
- [x] 1.5 Confirmar que todos os novos testes falham (RED)

## 2. `AuthService`

- [x] 2.1 Alterar `resolveUser(email)` para `resolveUser(id)` — query `WHERE id = $1 AND inactive = false`
- [x] 2.2 Adicionar método `getAuthEmail(id)` — query `SELECT email FROM auth.users WHERE id = $1`, lança `UnauthorizedException` se não encontrado

## 3. `JwtGuard`

- [x] 3.1 Remover `email` de `JwtPayload` e `JwtData`
- [x] 3.2 Após `jwtService.verify()`, validar que `payload.sub` é UUID v4 — setar `token-invalid` e retornar se inválido
- [x] 3.3 Alterar chamada de `authService.resolveUser(payload.email)` para `authService.resolveUser(payload.sub)`
- [x] 3.4 Alterar `request.jwtData` para `{ sub }` (remover `email`)

## 4. `UsersController`

- [x] 4.1 Remover bloco de validação UUID do `sub` em `create()` (linhas 47–51)
- [x] 4.2 Alterar `create()` para chamar `authService.getAuthEmail(sub)` e passar o resultado para `usersService.create()`
- [x] 4.3 Injetar `AuthService` no `UsersController`
- [x] 4.4 Remover `email` do destructuring de `req.jwtData`

## 5. Testing

- [x] 5.1 Verificar que todos os testes passam (GREEN)
- [x] 5.2 Verificar ausência de erros de ESLint nos arquivos modificados com `npm run lint`
- [x] 5.3 Executar suite completa com `npm test`
