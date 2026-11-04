-- RF04: estudos clínicos (dados fictícios). O estado segue o RF07; nesta versão o estudo nasce em PLANEJAMENTO.
CREATE TABLE estudo (
    id                   BIGSERIAL     PRIMARY KEY,
    titulo               VARCHAR(200)  NOT NULL,
    objetivo             VARCHAR(2000) NOT NULL,
    responsavel_id       BIGINT        NOT NULL REFERENCES usuario (id),
    data_inicio          DATE          NOT NULL,
    data_fim             DATE,
    limite_participantes INTEGER       NOT NULL,
    estado               VARCHAR(20)   NOT NULL DEFAULT 'PLANEJAMENTO',
    criado_em            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_estudo_limite CHECK (limite_participantes > 0),
    CONSTRAINT ck_estudo_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT ck_estudo_estado CHECK (estado IN ('PLANEJAMENTO', 'RECRUTAMENTO', 'EXECUCAO', 'ENCERRADO'))
);

CREATE INDEX ix_estudo_responsavel ON estudo (responsavel_id);
