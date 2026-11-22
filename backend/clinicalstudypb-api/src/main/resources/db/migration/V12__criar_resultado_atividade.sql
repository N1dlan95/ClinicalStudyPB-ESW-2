-- RF14 (task 3763): resultado fictício de cada atividade de uma visita realizada (MER-v3, seção 3.2).
-- As "avaliações previstas" são as atividades da visita prevista (RF06). Uma linha por atividade da visita:
-- registrar de novo a mesma atividade substitui o resultado.
-- A FK de atividade não tem ON DELETE CASCADE: atividade com resultado não é apagada (a visita prevista com
-- resultados não pode ser editada, VISITA_PREVISTA_COM_RESULTADOS).
CREATE TABLE resultado_atividade (
    id                BIGSERIAL    PRIMARY KEY,
    visita_id         BIGINT       NOT NULL REFERENCES visita (id),
    atividade_id      BIGINT       NOT NULL REFERENCES atividade (id),
    resultado         VARCHAR(500) NOT NULL,
    observacao        VARCHAR(500),
    registrado_por_id BIGINT       NOT NULL REFERENCES usuario (id),
    registrado_em     TIMESTAMP    NOT NULL,
    criado_em         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_resultado_visita_atividade UNIQUE (visita_id, atividade_id)
);

-- Usado para saber se uma atividade (e a visita prevista dela) já tem resultado
CREATE INDEX ix_resultado_atividade ON resultado_atividade (atividade_id);
