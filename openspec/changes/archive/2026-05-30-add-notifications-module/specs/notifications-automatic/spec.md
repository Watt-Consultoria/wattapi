## ADDED Requirements

### Requirement: Daily activity notification cronjob
A pg_cron job SHALL run daily at 03:00 UTC (midnight Brasília, UTC-3) and insert one notification row per activity whose `date` equals the current date in the `America/Sao_Paulo` timezone. The notification SHALL have `origin='automatic'` and `created_by=NULL`. The title SHALL be `'Atividade agendada para hoje: ' || activity.name`. The description SHALL be copied from the activity's `description` field (nullable).

#### Scenario: One notification per activity scheduled for today
- **WHEN** the cronjob runs and there are N activities with `date = today (Brasília)`
- **THEN** N notification rows are inserted, one per activity, each with `user_id` set to the activity's `user_id`

#### Scenario: No activities today produces no notifications
- **WHEN** the cronjob runs and no activities exist with `date = today (Brasília)`
- **THEN** no notification rows are inserted

#### Scenario: Title includes activity name
- **WHEN** an activity with name "Reunião de alinhamento" is processed by the cronjob
- **THEN** the notification title SHALL be "Atividade agendada para hoje: Reunião de alinhamento"

#### Scenario: Description is copied from activity
- **WHEN** an activity has a non-null description
- **THEN** the notification `description` SHALL equal the activity's description

#### Scenario: Null description is preserved
- **WHEN** an activity has a null description
- **THEN** the notification `description` SHALL also be null

#### Scenario: Cronjob runs independently of the API process
- **WHEN** the NestJS API is not running at 03:00 UTC
- **THEN** the cronjob SHALL still execute via pg_cron in the Supabase database

### Requirement: Cronjob scheduled via migration
The pg_cron job SHALL be registered via a Supabase migration using `cron.schedule()`. This ensures the schedule is version-controlled and applied consistently across environments.

#### Scenario: Migration registers the cron job
- **WHEN** the migration `schedule-activity-notifications-cron.sql` is applied
- **THEN** `SELECT * FROM cron.job WHERE jobname = 'daily-activity-notifications'` SHALL return one row with schedule `'0 3 * * *'`

#### Scenario: Job uses correct timezone for date comparison
- **WHEN** the cronjob SQL executes at 03:00 UTC on any date
- **THEN** `(now() AT TIME ZONE 'America/Sao_Paulo')::date` SHALL resolve to the correct Brasília calendar date, accounting for daylight saving time
