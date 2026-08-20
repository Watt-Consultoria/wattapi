## MODIFIED Requirements

### Requirement: Presidente Executivo can approve or reject a pending reimbursement
Only users with rank 4 (Presidente Executivo) SHALL be able to change the status of a reimbursement from `pending` to `approved` or `rejected`. Status transitions are one-way: once resolved, the status cannot be changed again. Approving a reimbursement additionally requires an `account_id` identifying the wallet account the payout comes from; the system SHALL atomically update the reimbursement status, create an `expense` wallet transaction on that account for the amount actually paid (using the reimbursement's own `category`), and decrease the account's `balance_cents` accordingly. Rejecting a reimbursement does not require or use `account_id`, `paid_amount_cents`, or `partial_reason`, and does not create any wallet transaction.

Approval MAY be partial: the caller MAY include `paid_amount_cents`, a positive integer no greater than the reimbursement's `amount_cents`, to pay out less than the requested amount. When `paid_amount_cents` is omitted, the full `amount_cents` is paid (unchanged behavior). When the paid amount is less than `amount_cents`, `partial_reason` (non-empty string) is required and is persisted alongside `paid_amount_cents` on the reimbursement. The resulting `wallet_transactions` row and the account debit always use the amount actually paid, not the amount requested.

#### Scenario: Approve a pending reimbursement in full
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<valid wallet account UUID>" }` and the reimbursement has `status = 'pending'`
- **THEN** the system SHALL update the reimbursement status to `approved`, set `paid_amount_cents` equal to `amount_cents`, create a `wallet_transactions` row of `type = 'expense'` for `amount_cents` on the given account, decrease that account's `balance_cents` by `amount_cents`, and return `200` with the updated reimbursement

#### Scenario: Partially approve a pending reimbursement
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<valid wallet account UUID>", "paid_amount_cents": <positive integer less than the reimbursement's amount_cents>, "partial_reason": "<non-empty string>" }` and the reimbursement has `status = 'pending'`
- **THEN** the system SHALL update the reimbursement status to `approved`, set `paid_amount_cents` and `partial_reason` to the given values, create a `wallet_transactions` row of `type = 'expense'` for `paid_amount_cents` (not `amount_cents`) on the given account, decrease that account's `balance_cents` by `paid_amount_cents`, and return `200` with the updated reimbursement

#### Scenario: Partial approval without a reason
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<valid wallet account UUID>", "paid_amount_cents": <positive integer less than the reimbursement's amount_cents> }` and no `partial_reason`
- **THEN** the system SHALL return `400` and SHALL NOT change the reimbursement status or create any wallet transaction

#### Scenario: paid_amount_cents exceeds the requested amount
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<valid wallet account UUID>", "paid_amount_cents": <integer greater than the reimbursement's amount_cents> }`
- **THEN** the system SHALL return `400` and SHALL NOT change the reimbursement status or create any wallet transaction

#### Scenario: paid_amount_cents is zero or negative
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<valid wallet account UUID>", "paid_amount_cents": 0 }` (or a negative value)
- **THEN** the system SHALL return `400` and SHALL NOT change the reimbursement status or create any wallet transaction

#### Scenario: Approve without account_id
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved" }` and no `account_id`
- **THEN** the system SHALL return `400` and SHALL NOT change the reimbursement status

#### Scenario: Approve with a non-existent account_id
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved", "account_id": "<UUID that does not match any wallet account>" }`
- **THEN** the system SHALL return `404` and SHALL NOT change the reimbursement status or create any wallet transaction

#### Scenario: Reject a pending reimbursement
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "rejected" }` and the reimbursement has `status = 'pending'`
- **THEN** the system SHALL update the reimbursement status to `rejected`, SHALL NOT create any wallet transaction, and return `200` with the updated reimbursement

#### Scenario: Attempt to change an already-resolved reimbursement
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` on a reimbursement whose status is already `approved` or `rejected`
- **THEN** the system SHALL return `400` indicating the status cannot be changed

#### Scenario: Invalid status value
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with a `status` value other than `approved` or `rejected`
- **THEN** the system SHALL return `400`

#### Scenario: Attempt to set status back to pending
- **WHEN** any user sends `PATCH /reimbursements/:id/status` with `{ "status": "pending" }`
- **THEN** the system SHALL return `400`

#### Scenario: Non-presidente user attempts status change
- **WHEN** a user with rank < 4 sends `PATCH /reimbursements/:id/status`
- **THEN** the system SHALL return `403`

#### Scenario: Reimbursement not found
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with a UUID that does not match any reimbursement
- **THEN** the system SHALL return `404`
