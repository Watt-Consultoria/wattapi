CREATE TABLE member_violations (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id),
  norm_id      UUID        NOT NULL REFERENCES company_norms(id),
  applied_by   UUID        NOT NULL REFERENCES users(id),
  reason       TEXT,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 year',
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID        REFERENCES users(id),
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_violations_user_id ON member_violations(user_id);
CREATE INDEX idx_member_violations_applied_by ON member_violations(applied_by);
CREATE INDEX idx_member_violations_active ON member_violations(user_id, expires_at)
  WHERE cancelled_at IS NULL;
