CREATE TYPE project_status AS ENUM ('em_andamento', 'em_revisao', 'revisado', 'finalizado');
-- em_andamento -> Criado e em execução
-- em_revisao   -> O gerente o marcou como "pronto para a revisão", agora o diretor vai revisar
-- revisado     -> O diretor aprovou, mas o projeto ainda está aberto para modificações
-- finalizado   -> O diretor o marcou como finalizado, o projeto não recebe mais modificações

CREATE TYPE project_stage_status AS ENUM ('pendente', 'em_revisao', 'concluida');
-- pendente    -> Criada pelo gerente e ainda não entregue pelo consultor
-- em_revisao  -> Entregue pelo consultor mas ainda não aprovada pelo gerente
-- concluida   -> Entregue pelo consultor e aprovada pelo gerente

CREATE TABLE projects (
  id               UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id          UUID           NOT NULL REFERENCES leads(id),
  project_type_id  UUID           NOT NULL REFERENCES portfolio_items(id),
  name             TEXT           NOT NULL,
  description      TEXT,
  delivery_date    DATE           NOT NULL,
  closing_notes    TEXT,
  closed_by        UUID           REFERENCES users(id),
  closed_at        TIMESTAMPTZ,
  status           project_status NOT NULL DEFAULT 'em_andamento',
  created_by       UUID           NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_lead_id     ON projects(lead_id);
CREATE INDEX idx_projects_status      ON projects(status);
CREATE INDEX idx_projects_created_by  ON projects(created_by);
CREATE INDEX idx_projects_created_at  ON projects(created_at DESC);

CREATE TABLE project_stages (
  id             UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     UUID                 NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  delivery_date  DATE                 NOT NULL,
  deadline_date  DATE                 NOT NULL,
  name           TEXT                 NOT NULL,
  description    TEXT                 NOT NULL,
  position       INTEGER              NOT NULL DEFAULT 1 CHECK (position > 0),
  consultant_id  UUID                 NOT NULL REFERENCES users(id),
  status         project_stage_status NOT NULL DEFAULT 'pendente',
  created_by     UUID                 NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ          NOT NULL DEFAULT now(),
  CONSTRAINT ck_stage_delivery_before_deadline CHECK (delivery_date < deadline_date)
);

CREATE INDEX idx_project_stages_project_id     ON project_stages(project_id);
CREATE INDEX idx_project_stages_consultant_id  ON project_stages(consultant_id);
CREATE INDEX idx_project_stages_status         ON project_stages(status);

CREATE TABLE project_stage_deliverables (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id    UUID NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE INDEX idx_project_stage_deliverables_stage_id ON project_stage_deliverables(stage_id);

CREATE TABLE stage_submissions (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id      UUID        NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  notes         TEXT,
  attempt       INTEGER     NOT NULL CHECK (attempt > 0),
  submitted_by  UUID        NOT NULL REFERENCES users(id),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stage_id, attempt)
);

CREATE INDEX idx_stage_submissions_stage_id ON stage_submissions(stage_id);

CREATE TABLE stage_submission_files (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID        NOT NULL REFERENCES stage_submissions(id) ON DELETE CASCADE,
  deliverable_id  UUID        NOT NULL REFERENCES project_stage_deliverables(id),
  path            TEXT        NOT NULL,
  name            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_submission_files_submission_id ON stage_submission_files(submission_id);

CREATE TABLE stage_reviews (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id      UUID        NOT NULL UNIQUE REFERENCES stage_submissions(id) ON DELETE CASCADE,
  approved           BOOLEAN     NOT NULL,
  notes              TEXT,
  new_delivery_date  DATE,
  reviewed_by        UUID        NOT NULL REFERENCES users(id),
  reviewed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_rework_date CHECK (approved OR new_delivery_date IS NOT NULL)
);

CREATE TABLE stage_review_reworks (
  review_id       UUID NOT NULL REFERENCES stage_reviews(id) ON DELETE CASCADE,
  deliverable_id  UUID NOT NULL REFERENCES project_stage_deliverables(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, deliverable_id)
);

CREATE TABLE project_reviews (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  round         INTEGER     NOT NULL CHECK (round > 0),
  approved      BOOLEAN     NOT NULL,
  notes         TEXT        NOT NULL,
  reviewer_id   UUID        NOT NULL REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, round)
);

CREATE INDEX idx_project_reviews_project_id ON project_reviews(project_id);

CREATE TABLE project_feedback (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  consultor_id  UUID        NOT NULL REFERENCES users(id),
  answers       JSONB       NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, consultor_id)
);

CREATE INDEX idx_project_feedback_project_id ON project_feedback(project_id);

-- Storage bucket: private, frontend uploads directly, backend validates existence and generates signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-stage-files', 'project-stage-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload project stage files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-stage-files');
