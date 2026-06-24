-- Fix: weekly-absence-check cron job was calling a Supabase Edge Function that does not exist.
-- The logic now lives in the NestJS backend at POST /internal/weekly-absence-check.
--
-- Before applying this migration, run the following in the Supabase SQL Editor for each environment:
--   ALTER DATABASE postgres SET "app.backend_url"          = 'https://<your-backend-host>';
--   ALTER DATABASE postgres SET "app.internal_job_secret"  = '<value of INTERNAL_JOB_SECRET env var>';
-- Then reconnect (or run: SELECT pg_reload_conf();) so the new settings take effect.

SELECT cron.unschedule('weekly-absence-check');

SELECT cron.schedule(
  'weekly-absence-check',
  '0 3 * * 1',
  $$
    SELECT net.http_post(
      url     := 'https://api.wattconsultoria.com.br/internal/weekly-absence-check',
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'X-Internal-Secret', 'dev-internal-job-secret-key-watt'
      ),
      body    := '{}'::jsonb
    );
  $$
);
