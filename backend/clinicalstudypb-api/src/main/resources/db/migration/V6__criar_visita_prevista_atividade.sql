CREATE TABLE visita_prevista (
    id            BIGSERIAL PRIMARY KEY,
    estudo_id     BIGINT NOT NULL REFERENCES estudo (id),
    ordem         INTEGER NOT NULL,
    nome          VARCHAR(120) NOT NULL,
    dia_previsto  INTEGER NOT NULL,
    janela_dias   INTEGER,
    descricao     VARCHAR(500),
    CONSTRAINT uk_visita_estudo_ordem UNIQUE (estudo_id, ordem),
    CONSTRAINT ck_visita_ordem CHECK (ordem > 0),
    CONSTRAINT ck_visita_dia_previsto CHECK (dia_previsto >= 0),
    CONSTRAINT ck_visita_janela_dias CHECK (janela_dias IS NULL OR janela_dias >= 0)
);

CREATE TABLE atividade (
    id                 BIGSERIAL PRIMARY KEY,
    visita_prevista_id BIGINT NOT NULL REFERENCES visita_prevista (id) ON DELETE CASCADE,
    ordem              INTEGER NOT NULL,
    descricao          VARCHAR(500) NOT NULL,
    CONSTRAINT uk_atividade_visita_ordem UNIQUE (visita_prevista_id, ordem),
    CONSTRAINT ck_atividade_ordem CHECK (ordem > 0)
);

CREATE INDEX ix_visita_prevista_estudo ON visita_prevista (estudo_id, ordem);
