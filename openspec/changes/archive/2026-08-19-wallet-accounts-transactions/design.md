## Context

The Carteira Watt frontend (`../Carteira Watt UI/`) is a wallet UI mocked up with accounts (checking/savings/credit_card/investment/cash), a balance per account, and transactions with a type (income/expense), category, and account reference. None of this exists in the backend yet.

Separately, `reimbursements` already has an approval flow (`PATCH /reimbursements/:id/status`, rank 4 / Presidente Executivo only, see `reimbursements-status` spec) that flips `status` to `approved`/`rejected` but has no effect on any account balance — approved reimbursements are just a status change today.

This change introduces the wallet data model (`wallet_accounts`, `wallet_transactions`) and wires reimbursement approval into it, so that approving a reimbursement debits a real account.

## Goals / Non-Goals

**Goals:**
- Persist wallet accounts and transactions with rank-gated read/write access, matching the existing `RoutePolicy` + `role-hierarchy.ts` (`getRank`) conventions used by `reimbursements`, `projects`, etc.
- Reuse the existing `reimbursement_category` enum for transaction categories instead of introducing a parallel taxonomy, per the requester's explicit instruction.
- Make reimbursement approval atomically create a wallet transaction and update the target account's balance.
- Let the Presidente Executivo pay out less than the requested `amount_cents` on approval (partial approval), while keeping the originally requested amount intact for audit purposes.

**Non-Goals:**
- Building the Carteira Watt frontend itself — this change is backend-only, per the request ("preciso primeiro implementar isso no banco de dados").
- Account deletion/deactivation — only create, edit (name/type), and list were requested.
- Overdraft protection / insufficient-balance validation — confirmed with the requester that balances may go negative.
- Transaction edit/delete — only create + list were requested for transactions.
- Multi-currency support — amounts are BRL cents, matching the `reimbursements.amount_cents` convention.
- Multi-tranche payouts — a partial approval is a one-shot final decision, same as full approval (status transitions remain one-way per the existing `reimbursements-status` invariant). The unpaid remainder is not tracked as still-payable or reopenable; if more needs to be paid, that's a new reimbursement request.

## Decisions

### Rank mapping to existing RBA roles
`ROLE_RANK` is `consultor:0, gerente:1, diretor:2, assessor:3, presidente:4` (`src/common/guards/role-hierarchy.ts`). "rank > 3" therefore maps to the single role `presidente`; "rank >= 2" maps to `['diretor', 'assessor', 'presidente']`. These are expressed as `RoutePolicy` `rba: [['role', [...]]]` conditions (see `reimbursements.controller.ts`'s `updateStatus` for the rank-4-only precedent, and `projects.controller.ts`'s `MANAGER_ACCESS`/`PROJECT_DIRECTOR_ACCESS` for the multi-role precedent) rather than a new numeric-rank RBA condition type, to stay consistent with the codebase's existing role-list pattern instead of introducing a second access-control mechanism.

### Table design: `wallet_accounts` / `wallet_transactions`
- `wallet_accounts`: `id, name, type (enum: checking|savings|credit_card|investment|cash), balance_cents (integer), created_by, created_at, updated_at`. `balance_cents` mirrors `reimbursements.amount_cents` (integer cents, no floats) for consistency and to avoid rounding bugs.
- `wallet_transactions`: `id, account_id (FK -> wallet_accounts), type (enum: income|expense), amount_cents (integer, > 0), category (reimbursement_category), description, transaction_date (date), created_by, created_at`. `amount_cents` is always stored positive; `type` determines the sign applied to the account balance (`income` → `+amount_cents`, `expense` → `-amount_cents`), avoiding sign-interpretation bugs in balance math.
- `category` reuses `reimbursement_category` (already an ENUM type from the reimbursements migration) rather than duplicating the same 5 values in a new `wallet_transaction_category` enum — one taxonomy, one place to add a category in the future.

### Applying the balance delta
Balance updates happen inside the same DB transaction (`DatabaseService.withTransaction`, already used in `ReimbursementsService.create`) as the transaction insert: `UPDATE wallet_accounts SET balance_cents = balance_cents + $delta WHERE id = $1`. Doing the arithmetic in SQL (not read-then-write in application code) avoids a race condition between concurrent transactions on the same account.

### Reimbursement approval → wallet transaction
`UpdateReimbursementStatusDto` gains an `account_id` field, required only when `status = 'approved'` (Zod `.refine`). `ReimbursementsService.updateStatus` wraps the existing status UPDATE plus a new `wallet_transactions` INSERT (`type: 'expense'`, `amount_cents` = the reimbursement's `amount_cents`, `category` = the reimbursement's own `category` since both use the same enum, `description` referencing the reimbursement) and the account balance UPDATE in one `withTransaction` call, so a failure (e.g. invalid `account_id`) rolls back the status change too — approval and the resulting debit are all-or-nothing.

### Partial approval: `paid_amount_cents` + `partial_reason`, no new status
`reimbursements` gains two nullable columns: `paid_amount_cents INTEGER` and `partial_reason TEXT`. `amount_cents` keeps its current meaning ("amount requested") and is never modified; `paid_amount_cents` is populated only when a reimbursement is approved and records what was actually paid out. This avoids introducing a third status value (e.g. `partially_approved`) that every existing status-based check (filters, reports, the future Carteira Watt UI) would need to learn about — `status` still only distinguishes `pending` / `approved` / `rejected`; whether an approval was full or partial is a property of the approved amount, not a different kind of resolution.

`UpdateReimbursementStatusDto` gains optional `paid_amount_cents` (positive int) and `partial_reason` (non-empty string) fields, validated in `ReimbursementsService.updateStatus` (not purely in the Zod schema, since validation depends on the target reimbursement's `amount_cents`, which isn't in the request body):
- `payout = dto.paid_amount_cents ?? reimbursement.amount_cents` — omitting the field preserves today's full-approval behavior exactly.
- `payout` must be `> 0` and `<= reimbursement.amount_cents` (400 otherwise) — paying more than requested is rejected, paying the full amount via an explicit `paid_amount_cents` equal to `amount_cents` is allowed and treated as a full approval.
- When `payout < reimbursement.amount_cents`, `partial_reason` is required (400 if missing) — a reduced payout must carry an audit trail of why. When `payout === reimbursement.amount_cents`, `partial_reason` is optional and stored as given (not forced to null), since a reason attached to a full approval is harmless.
- The wallet transaction created on approval uses `amount_cents = payout` (not `reimbursement.amount_cents`), and its `description` appends a `(parcial)` marker when `payout < reimbursement.amount_cents`, so the account's transaction history is self-explanatory without cross-referencing the reimbursement.
- `ReimbursementResponseDto` gains `paid_amount_cents: number | null` and `partial_reason: string | null` so callers (and the future frontend) can tell a partial approval apart from a full one without extra requests.

Traceability note: `wallet_transactions` does not gain a `reimbursement_id` column (considered and rejected for this change) — the link from an approval-generated transaction back to its reimbursement stays in the transaction's free-text `description`, consistent with how that link already worked before partial approval was introduced. This can be revisited later without a breaking change if querying "all transactions for reimbursement X" becomes a real need.

### No insufficient-balance check
Per requester decision, balances may go negative (mirrors the mockup's credit-card account showing `-1840.30`). No pre-check is performed before applying a transaction or an approval-triggered debit.

## Risks / Trade-offs

- [Risk] `account_id` becomes a required field on an existing endpoint (`PATCH /reimbursements/:id/status`) → **BREAKING** for any existing frontend caller. → Mitigation: field is only required when `status = 'approved'`; `rejected` calls are unaffected. Frontend must be updated alongside this change to pass `account_id` on approval.
- [Risk] Negative balances are allowed with no guardrail, so a mis-entered transaction or reimbursement approval could silently put an account far into the negative. → Mitigation: out of scope per explicit requester decision; can be added later as an opt-in check without a schema change.
- [Risk] Deleting/deactivating accounts is not supported, so a mis-created account is permanent (edit only touches name/type, not `balance_cents` directly, and there's no soft-delete flag). → Mitigation: out of scope per the request; can be added in a follow-up change if needed.
- [Risk] `paid_amount_cents` and `partial_reason` add two more optional, cross-validated fields to an already-branching `UpdateReimbursementStatusDto` (status + conditional `account_id` + conditional `paid_amount_cents`/`partial_reason`), making the validation logic harder to read as a flat Zod schema. → Mitigation: keep amount/reason validation in the service layer (see Decision above) rather than forcing it into `.refine()` chains; if the branching grows further, splitting into a dedicated `POST /reimbursements/:id/approve` + `POST /reimbursements/:id/reject` pair is a reasonable follow-up, but out of scope here since the existing endpoint already handles both.

## Migration Plan

1. New migration creates `wallet_accounts`, `wallet_transactions`, indexes, and reuses the existing `reimbursement_category` enum (created in `20260531160000_create-reimbursements-tables.sql`); same or a companion migration adds `reimbursements.paid_amount_cents INTEGER` and `reimbursements.partial_reason TEXT` (both nullable, no default).
2. New `wallet` module (controller/service/DTOs) added; no changes to existing modules other than `reimbursements`.
3. `reimbursements` DTO/service updated for the `account_id`, `paid_amount_cents`, and `partial_reason` fields and transaction-creation-on-approval behavior (using the actual paid amount, not always the full requested amount).
4. No data backfill needed — this is new functionality with no prior rows to migrate; existing approved reimbursements simply have `paid_amount_cents = NULL` (their payout amount, if ever needed, is inferable as equal to `amount_cents` since partial approval didn't exist before).
5. Rollback: drop the new migration (tables and columns are additive) and revert the `reimbursements` DTO/service changes; no destructive change to existing `reimbursements` data.
