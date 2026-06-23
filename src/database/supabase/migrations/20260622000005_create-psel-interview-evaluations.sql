CREATE TABLE psel_interview_evaluations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID        NOT NULL UNIQUE REFERENCES psel_interview_bookings(id),
  evaluator_id            UUID        NOT NULL REFERENCES users(id),

  proatividade            SMALLINT    NOT NULL CHECK (proatividade BETWEEN 1 AND 5),
  lideranca               SMALLINT    NOT NULL CHECK (lideranca BETWEEN 1 AND 5),
  transparencia           SMALLINT    NOT NULL CHECK (transparencia BETWEEN 1 AND 5),
  uniao_de_time           SMALLINT    NOT NULL CHECK (uniao_de_time BETWEEN 1 AND 5),
  comunicacao             SMALLINT    NOT NULL CHECK (comunicacao BETWEEN 1 AND 5),
  seriedade               SMALLINT    NOT NULL CHECK (seriedade BETWEEN 1 AND 5),
  compromisso             SMALLINT    NOT NULL CHECK (compromisso BETWEEN 1 AND 5),
  proposito               SMALLINT    NOT NULL CHECK (proposito BETWEEN 1 AND 5),
  autoresponsabilidade    SMALLINT    NOT NULL CHECK (autoresponsabilidade BETWEEN 1 AND 5),
  autoconfianca           SMALLINT    NOT NULL CHECK (autoconfianca BETWEEN 1 AND 5),
  responsabilidade_social SMALLINT    NOT NULL CHECK (responsabilidade_social BETWEEN 1 AND 5),
  criatividade            SMALLINT    NOT NULL CHECK (criatividade BETWEEN 1 AND 5),

  procrastinacao          BOOLEAN     NOT NULL,
  desinteresse            BOOLEAN     NOT NULL,
  falta_de_transparencia  BOOLEAN     NOT NULL,
  proposito_vago          BOOLEAN     NOT NULL,
  vitimizacao             BOOLEAN     NOT NULL,
  falta_de_confianca      BOOLEAN     NOT NULL,

  observacoes             TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
