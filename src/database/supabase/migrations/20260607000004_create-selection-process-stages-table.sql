CREATE TABLE selection_process_stages (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  name                 TEXT        NOT NULL,
  position             INT         NOT NULL CHECK (position > 0),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (selection_process_id, position)
);
