## ADDED Requirements

### Requirement: Presidente Executivo can approve or reject a pending reimbursement
Only users with rank 4 (Presidente Executivo) SHALL be able to change the status of a reimbursement from `pending` to `approved` or `rejected`. Status transitions are one-way: once resolved, the status cannot be changed again.

#### Scenario: Approve a pending reimbursement
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "approved" }` and the reimbursement has `status = 'pending'`
- **THEN** the system SHALL update the reimbursement status to `approved` and return `200` with the updated reimbursement

#### Scenario: Reject a pending reimbursement
- **WHEN** a Presidente Executivo sends `PATCH /reimbursements/:id/status` with `{ "status": "rejected" }` and the reimbursement has `status = 'pending'`
- **THEN** the system SHALL update the reimbursement status to `rejected` and return `200` with the updated reimbursement

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
