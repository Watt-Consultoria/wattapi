CREATE TABLE psel_interview_bookings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  candidate_id         UUID        NOT NULL UNIQUE REFERENCES candidates(id),
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  booked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
