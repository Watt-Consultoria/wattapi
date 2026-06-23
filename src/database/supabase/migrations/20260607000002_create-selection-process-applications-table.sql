CREATE TYPE application_status AS ENUM ('pending', 'approved', 'reproved');
CREATE TYPE shirt_size AS ENUM ('P', 'M', 'G', 'GG', 'XG');

CREATE TABLE selection_process_applications (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID              NOT NULL REFERENCES selection_processes(id),
  name                 TEXT              NOT NULL,
  course               TEXT              NOT NULL,
  period               INT               NOT NULL CHECK (period > 0),
  phone                TEXT              NOT NULL,
  email                TEXT              NOT NULL,
  instagram            TEXT              NOT NULL,
  how_heard            TEXT              NOT NULL,
  motivation           TEXT              NOT NULL,
  why_watt             TEXT              NOT NULL,
  shirt_size           shirt_size        NOT NULL,
  resume_path          TEXT              NOT NULL,
  transcript_path      TEXT              NOT NULL,
  photo_path           TEXT              NOT NULL,
  status               application_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ       DEFAULT NOW(),
  UNIQUE (selection_process_id, email)
);
