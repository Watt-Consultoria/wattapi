CREATE TYPE notification_origin AS ENUM ('automatic', 'directed');

CREATE TABLE notifications (
  id          UUID                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID                NOT NULL REFERENCES users(id),
  title       TEXT                NOT NULL,
  description TEXT,
  origin      notification_origin NOT NULL,
  sent_at     TIMESTAMPTZ         NOT NULL DEFAULT now(),
  created_by  UUID                REFERENCES users(id),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_active  ON notifications(user_id, sent_at DESC) WHERE deleted_at IS NULL;
