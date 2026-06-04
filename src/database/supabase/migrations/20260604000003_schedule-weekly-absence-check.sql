-- Requires pg_cron and net extensions enabled in Supabase
-- Triggers the weekly-absence-trigger Edge Function every Monday at 03:00 UTC
SELECT cron.schedule(
  'weekly-absence-check',
  '0 3 * * 1',
  $$
    SELECT net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/weekly-absence-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      body   := '{}'::jsonb
    );
  $$
);
