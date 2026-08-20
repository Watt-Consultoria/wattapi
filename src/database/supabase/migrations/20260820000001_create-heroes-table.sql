CREATE TABLE heroes (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL UNIQUE REFERENCES users(id),
  phrase        TEXT        NOT NULL,
  contributions TEXT        NOT NULL,
  start_year    INTEGER     NOT NULL,
  end_year      INTEGER     NOT NULL,
  photo_path    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_hero_start_before_end CHECK (start_year <= end_year)
);

-- user_id already has an implicit index via the UNIQUE constraint above.
CREATE INDEX idx_heroes_created_at ON heroes(created_at DESC);

-- Storage bucket: private, frontend uploads directly, backend validates existence and generates signed URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-photos', 'hero-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload hero photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hero-photos');
