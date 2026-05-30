CREATE TYPE activity_priority AS ENUM ('alta', 'media', 'baixa');

CREATE TABLE activities (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES users(id),
  name        TEXT              NOT NULL,
  description TEXT,
  date        DATE              NOT NULL,
  time_start  TIME              NOT NULL,
  time_end    TIME              NOT NULL,
  priority    activity_priority NOT NULL,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),

  CONSTRAINT chk_activities_time_range CHECK (time_end > time_start)
);

CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_date    ON activities(date);
