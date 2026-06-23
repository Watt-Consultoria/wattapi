CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_push_subscriptions_user_endpoint_active
  ON push_subscriptions (user_id, endpoint)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions (user_id);
