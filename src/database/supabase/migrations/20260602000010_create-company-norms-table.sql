CREATE TYPE norm_severity AS ENUM ('leve', 'moderada', 'grave', 'desligamento');

CREATE TABLE company_norms (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT          NOT NULL UNIQUE,
  description TEXT          NOT NULL,
  severity    norm_severity NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_norms_code ON company_norms(code);
