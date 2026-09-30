CREATE TABLE almoxarifado_materiais (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome               TEXT        NOT NULL,
  descricao          TEXT        NOT NULL,
  quantidade_estoque INTEGER     NOT NULL,
  observacoes        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_almoxarifado_materiais_quantidade_estoque CHECK (quantidade_estoque >= 0)
);

CREATE TABLE almoxarifado_emprestimos (
  id                    UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id           UUID        NOT NULL REFERENCES almoxarifado_materiais(id),
  quantidade            INTEGER     NOT NULL,
  user_id               UUID        NOT NULL REFERENCES users(id),
  emprestado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsao_devolucao    TIMESTAMPTZ NOT NULL,
  devolvido_em          TIMESTAMPTZ,
  observacoes           TEXT,
  atraso_notificado_em  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_almoxarifado_emprestimos_quantidade CHECK (quantidade > 0)
);

CREATE INDEX idx_almoxarifado_emprestimos_material_id ON almoxarifado_emprestimos(material_id);
CREATE INDEX idx_almoxarifado_emprestimos_user_id ON almoxarifado_emprestimos(user_id);
CREATE INDEX idx_almoxarifado_emprestimos_devolvido_em ON almoxarifado_emprestimos(devolvido_em);
CREATE INDEX idx_almoxarifado_emprestimos_atraso ON almoxarifado_emprestimos(previsao_devolucao)
  WHERE devolvido_em IS NULL AND atraso_notificado_em IS NULL;
