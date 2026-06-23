CREATE TABLE psel_interview_slots (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_process_id UUID        NOT NULL REFERENCES selection_processes(id),
  consultant_id        UUID        NOT NULL REFERENCES users(id),
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  booking_id           UUID        REFERENCES psel_interview_bookings(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (consultant_id, starts_at)
);
