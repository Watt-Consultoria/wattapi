CREATE TABLE internal_job_runs (
  id       UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT        NOT NULL,
  ran_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_job_runs_job_name_ran_at ON internal_job_runs(job_name, ran_at);
