CREATE TABLE lead_contacts (
  id      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  role    TEXT NOT NULL,
  email   TEXT,
  phone   TEXT,
  CONSTRAINT lead_contacts_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_lead_contacts_lead_id ON lead_contacts(lead_id);
