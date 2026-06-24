SELECT cron.schedule(
  'daily-job',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url     := 'http://localhost:3000/internal/daily-job',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'X-Internal-Secret', 'dev-internal-job-secret-key-watt'
      ),
      body    := '{}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'weekly-job',
  '0 3 * * 1',
  $$
    SELECT net.http_post(
      url     := 'http://localhost:3001/internal/weekly-job',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'X-Internal-Secret', 'dev-internal-job-secret-key-watt'
      ),
      body    := '{}'::jsonb
    );
  $$
);
