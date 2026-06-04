ALTER TABLE member_violations
  ALTER COLUMN applied_by DROP NOT NULL;

ALTER TABLE member_violations
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE member_violations
  ADD CONSTRAINT chk_applied_by_source
  CHECK (applied_by IS NOT NULL OR source = 'automatic');
