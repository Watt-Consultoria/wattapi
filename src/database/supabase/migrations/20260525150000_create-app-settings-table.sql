CREATE TABLE app_settings (
  -- Id para tabela singleton, garantindo que haja apenas uma linha de configuração
  id              BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  min_week_hours  INT         NOT NULL DEFAULT 4,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings DEFAULT VALUES;
