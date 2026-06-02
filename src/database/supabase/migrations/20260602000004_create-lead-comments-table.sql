CREATE TABLE lead_comments (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id    UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX idx_lead_comments_user_id ON lead_comments(user_id);
