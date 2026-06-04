## MODIFIED Requirements

### Requirement: Modelo de dados de violations
A tabela `member_violations` SHALL armazenar as faltas aplicadas com os campos: `id` (UUID, PK), `user_id` (UUID, NOT NULL, FK → users.id — membro infrator), `norm_id` (UUID, NOT NULL, FK → company_norms.id), `applied_by` (UUID, **nullable**, FK → users.id — quem aplicou; NULL apenas para faltas automáticas), `source` (TEXT NOT NULL DEFAULT `'manual'` — enum `'manual' | 'automatic'`), `reason` (TEXT, nullable — justificativa opcional), `expires_at` (TIMESTAMPTZ, NOT NULL — `applied_at + interval '1 year'`), `cancelled_at` (TIMESTAMPTZ, nullable — null = ativa), `cancelled_by` (UUID, FK → users.id, nullable), `applied_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()), `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()).

Constraint CHECK: `applied_by IS NOT NULL OR source = 'automatic'` — garante que `applied_by` só pode ser NULL quando `source = 'automatic'`.

#### Scenario: Estrutura da tabela após migration
- **WHEN** a migration de alteração é aplicada
- **THEN** a coluna `applied_by` aceita NULL e a coluna `source` existe com DEFAULT `'manual'`

#### Scenario: Constraint CHECK bloqueia applied_by null com source manual
- **WHEN** uma violation é inserida com `applied_by = NULL` e `source = 'manual'`
- **THEN** o banco rejeita o insert com erro de constraint

#### Scenario: applied_by null é aceito quando source = automatic
- **WHEN** uma violation é inserida com `applied_by = NULL` e `source = 'automatic'`
- **THEN** o insert é aceito

#### Scenario: expires_at é calculado automaticamente
- **WHEN** uma violation é inserida sem `expires_at` explícito
- **THEN** `expires_at` SHALL ser `applied_at + interval '1 year'`
