## 1. Migration — criar tabela `app_settings`

- [x] 1.1 Criar migration `<timestamp>_create-app-settings-table.sql` em `src/database/supabase/migrations/` com:
  - Tabela `app_settings` com constraint de singleton (`id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE)`)
  - Coluna `min_week_hours INT NOT NULL DEFAULT 40`
  - Coluna `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `INSERT INTO app_settings DEFAULT VALUES` para seed da linha inicial

---

## 2. Estrutura do módulo

- [x] 2.1 Criar `src/modules/settings/settings.module.ts` com `@Global()` e exportando `SettingsService`
- [x] 2.2 Criar `src/modules/settings/settings.controller.ts`
- [x] 2.3 Criar `src/modules/settings/settings.service.ts`
- [x] 2.4 Criar `src/modules/settings/dto/settings.dto.ts` com schema Zod e tipos de request/response
- [x] 2.5 Registrar `SettingsModule` em `src/app.module.ts`

---

## 3. TDD — escrever testes antes da implementação

- [x] 3.1 Criar `src/modules/settings/settings.service.spec.ts` com testes para:
  - `getAll()`: retorna o objeto de settings com os valores corretos
  - `update({ min_week_hours: 35 })`: persiste no banco e retorna settings atualizadas
  - `update({ min_week_hours: -1 })`: lança exceção de validação (valor inválido)
  - `get('min_week_hours')`: retorna o valor correto do cache sem consultar o banco

- [x] 3.2 Criar `src/modules/settings/settings.controller.spec.ts` com testes para:
  - `GET /settings`: retorna 200 com objeto de settings para usuário autenticado
  - `GET /settings`: retorna 401 para requisição sem token
  - `PATCH /settings` com `{ min_week_hours: 35 }`: retorna 200 com settings atualizadas para superusuário (rank >= 3)
  - `PATCH /settings`: retorna 403 para usuário sem rank de superusuário
  - `PATCH /settings` com body inválido (ex: `{ min_week_hours: "abc" }`): retorna 400

- [x] 3.3 Confirmar que todos os testes falham (RED) antes de implementar

---

## 4. Implementação — service

- [x] 4.1 Definir tipo `AppSettings` e schema Zod de validação do PATCH em `settings.dto.ts`:
  - `min_week_hours`: `z.number().int().positive()`

- [x] 4.2 Implementar `SettingsService`:
  - Campo privado `cache: AppSettings`
  - `onModuleInit()`: carrega settings do banco via `SELECT * FROM app_settings WHERE id = TRUE` e popula `cache`
  - `getAll(): AppSettings`: retorna `cache` diretamente (síncrono)
  - `get<K extends keyof AppSettings>(key: K): AppSettings[K]`: retorna `cache[key]` (síncrono)
  - `update(data: Partial<AppSettings>): Promise<AppSettings>`: monta SET dinâmico, executa `UPDATE app_settings SET ..., updated_at = now() WHERE id = TRUE RETURNING *`, atualiza `cache` e retorna o resultado

---

## 5. Implementação — controller

- [x] 5.1 Implementar `GET /settings`:
  - `@RoutePolicy({ access: { mode: 'authenticated' } })`
  - Delegar a `settingsService.getAll()`
  - Retornar 200 com o objeto de settings (excluindo `id` e `updated_at` da resposta)

- [x] 5.2 Implementar `PATCH /settings`:
  - `@RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })`
  - Validar body com schema Zod; lançar `BadRequestException` com `error.flatten()` se inválido
  - Verificar que pelo menos um campo foi fornecido; lançar `BadRequestException` se body vazio
  - Delegar a `settingsService.update(data)`
  - Retornar 200 com o objeto completo de settings atualizado (excluindo `id` e `updated_at`)

---

## 6. Verificação

- [x] 6.1 Rodar `npm test` — todos os testes novos devem passar (GREEN)
- [x] 6.2 Rodar `npm run lint` — sem erros nos arquivos modificados
- [ ] 6.3 Testar manualmente via REST client:
  - `GET /settings` com token válido → 200 com `{ "min_week_hours": 40 }`
  - `GET /settings` sem token → 401
  - `PATCH /settings` com `{ "min_week_hours": 35 }` como superusuário → 200 com valor atualizado
  - `PATCH /settings` como usuário sem rank de superusuário → 403
  - `PATCH /settings` com `{ "min_week_hours": "abc" }` → 400 com erros de validação
  - Reiniciar o servidor e verificar que o cache é recarregado com o valor atualizado (35) do banco
