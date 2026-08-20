ALTER TABLE reimbursements
  ADD COLUMN paid_amount_cents INTEGER,
  ADD COLUMN partial_reason TEXT;
