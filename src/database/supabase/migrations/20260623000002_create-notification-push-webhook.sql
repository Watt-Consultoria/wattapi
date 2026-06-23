-- Database Webhook: fires Edge Function on every notification INSERT.
-- Uses pg_net directly (supabase_functions schema is not accessible via db push).
--
-- VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set as Supabase secrets:
--   supabase secrets set VAPID_PUBLIC_KEY=<key> VAPID_PRIVATE_KEY=<key>
CREATE OR REPLACE FUNCTION public.trigger_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'http://supabase_kong_wattapi:8000/functions/v1/notification-push-trigger',
    body := jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     to_jsonb(NEW),
      'old_record', null
    ),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notification_push_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_push();
