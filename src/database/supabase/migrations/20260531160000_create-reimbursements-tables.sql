CREATE TYPE reimbursement_category AS ENUM (
  'ingresso',
  'alimentação',
  'transporte',
  'equipamento',
  'outro'
);

CREATE TABLE reimbursements (
  id           UUID                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID                    NOT NULL REFERENCES users(id),
  title        TEXT                    NOT NULL,
  description  TEXT                    NOT NULL,
  amount_cents INTEGER                 NOT NULL CHECK (amount_cents > 0),
  category     reimbursement_category  NOT NULL,
  pix_key      TEXT                    NOT NULL,
  status       TEXT                    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE TABLE reimbursement_attachments (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reimbursement_id  UUID        NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
  path              TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reimbursements_user_id  ON reimbursements(user_id);
CREATE INDEX idx_reimbursements_status   ON reimbursements(status);
CREATE INDEX idx_reimbursements_created  ON reimbursements(created_at DESC);
CREATE INDEX idx_reimb_attachments_reimb ON reimbursement_attachments(reimbursement_id);

-- Storage bucket: private, frontend uploads directly, backend generates signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('reimbursement-receipts', 'reimbursement-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload only to their own path: receipts/{userId}/...
CREATE POLICY "Authenticated users can upload to own path"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reimbursement-receipts'
  AND (string_to_array(name, '/'))[1] = 'receipts'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);
