CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-activity-notifications',
  '0 3 * * *',
  $$
    INSERT INTO notifications (user_id, title, description, origin)
    SELECT
      user_id,
      'Atividade agendada para hoje: ' || name,
      description,
      'automatic'
    FROM activities
    WHERE date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
  $$
);
