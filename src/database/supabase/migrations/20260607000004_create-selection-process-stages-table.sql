CREATE TABLE selection_process_stages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  name                 TEXT        NOT NULL,
  position             INT         NOT NULL CHECK (position > 0),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (selection_process_id, position)
);
