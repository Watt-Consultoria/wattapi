CREATE TABLE leads (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name        TEXT        NOT NULL,
  created_by          UUID        NOT NULL REFERENCES users(id),
  status              TEXT        NOT NULL DEFAULT 'nao_contatado'
                        CHECK (status IN ('nao_contatado', 'em_progresso', 'contatado')),
  address_logradouro  TEXT        NOT NULL,
  address_numero      TEXT        NOT NULL,
  address_complemento TEXT,
  address_bairro      TEXT        NOT NULL,
  address_cidade      TEXT        NOT NULL,
  address_estado      TEXT        NOT NULL,
  address_cep         TEXT        NOT NULL,
  interest_items      TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_created_by ON leads(created_by);
CREATE INDEX idx_leads_status     ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
