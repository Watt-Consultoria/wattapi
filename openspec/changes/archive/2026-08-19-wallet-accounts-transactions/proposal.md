## Why

The frontend needs to implement the Carteira Watt wallet page (accounts + transactions), but there is no backend support for it yet. Reimbursements are also currently approved without moving money out of any tracked account — approval and the company's cash position are disconnected.

## What Changes

- Add a `wallet_accounts` table and CRUD endpoints: create and edit are restricted to rank > 3 (Presidente Executivo only); listing (all accounts / one account) is available to rank >= 2 (Diretor and above).
- Add a `wallet_transactions` table and endpoints to create and list transactions:
  - Create is restricted to rank > 3 (Presidente Executivo only).
  - Every transaction specifies the `account_id` it belongs to; the backend loads that account and applies the transaction to its balance (`income` adds, `expense` subtracts). Balances are allowed to go negative — no insufficient-funds check.
  - Transaction `category` reuses the existing `reimbursement_category` enum (`ingresso`, `alimentação`, `transporte`, `equipamento`, `outro`) so both features share one category taxonomy.
  - Listing is available to rank >= 2.
- **BREAKING**: `PATCH /reimbursements/:id/status` now requires an `account_id` field when `status = 'approved'` (not required/ignored when `status = 'rejected'`). On approval, the backend atomically creates an `expense` wallet transaction on that account and updates the reimbursement status, so the account balance reflects the payout.
- Approving a reimbursement now supports **partial approval**: the Presidente Executivo may optionally send `paid_amount_cents` (less than the reimbursement's `amount_cents`) to pay out only part of the requested amount. When omitted, approval pays the full `amount_cents` as before. A partial payout requires a `partial_reason` explaining the reduction. The wallet transaction and account debit always reflect the actual amount paid, not the amount requested.

## Capabilities

### New Capabilities
- `wallet-accounts`: CRUD (create, edit, list) for wallet accounts with rank-gated access.
- `wallet-transactions`: Create and list wallet transactions tied to an account, applying balance deltas and sharing reimbursement categories.

### Modified Capabilities
- `reimbursements-status`: Approving a reimbursement now requires an `account_id`, supports paying out less than the requested amount (`paid_amount_cents` + required `partial_reason` when partial), and creates a corresponding wallet transaction that debits that account for the amount actually paid.

## Impact

- New DB migration: `wallet_accounts`, `wallet_transactions` tables, reusing the `reimbursement_category` enum type; plus an `ALTER TABLE reimbursements ADD COLUMN paid_amount_cents INTEGER, ADD COLUMN partial_reason TEXT` for partial-approval tracking.
- New module `src/modules/wallet/` (or similar) with controller/service/DTOs for accounts and transactions, following the `reimbursements` module pattern (RoutePolicy + rank checks via `role-hierarchy.ts`).
- Changes to `src/modules/reimbursements/`: `UpdateReimbursementStatusDto` gains conditional `account_id`, `paid_amount_cents`, and `partial_reason` fields; `ReimbursementResponseDto` gains `paid_amount_cents` and `partial_reason`; `ReimbursementsService.updateStatus` gains a DB transaction that also inserts a wallet transaction (for the amount actually paid) and updates the account balance when approving.
- Frontend Carteira Watt UI (`../Carteira Watt UI/`) becomes buildable against these endpoints in a follow-up change — out of scope here.
