CREATE TYPE candidate_status AS ENUM ('active', 'eliminated', 'approved');

CREATE TABLE candidates (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id       UUID             NOT NULL UNIQUE REFERENCES selection_process_applications(id),
  selection_process_id UUID             NOT NULL REFERENCES selection_processes(id),
  current_stage_id     UUID             NOT NULL REFERENCES selection_process_stages(id),
  name                 TEXT             NOT NULL,
  course               TEXT             NOT NULL,
  period               INT              NOT NULL,
  phone                TEXT             NOT NULL,
  email                TEXT             NOT NULL,
  photo_path           TEXT             NOT NULL,
  shirt_size           shirt_size       NOT NULL,
  status               candidate_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ      DEFAULT NOW()
);
