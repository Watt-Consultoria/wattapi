CREATE TABLE time_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id),
  clocked_in_at   timestamptz NOT NULL DEFAULT now(),
  clocked_out_at  timestamptz,
  is_valid        boolean,
  annulled_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clock_out_after_clock_in
    CHECK (clocked_out_at IS NULL OR clocked_out_at > clocked_in_at)
);

CREATE UNIQUE INDEX one_open_session_per_user
  ON time_entries (user_id)
  WHERE clocked_out_at IS NULL;
