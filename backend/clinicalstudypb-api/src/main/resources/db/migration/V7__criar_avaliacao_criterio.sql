-- RF09: avaliação de elegibilidade critério por critério (MER-v2, seções 3.3 e 3.4).
-- A V6 está reservada para visitas previstas (task 3552).
CREATE TABLE avaliacao_criterio (
    id           BIGSERIAL    PRIMARY KEY,
    candidato_id BIGINT       NOT NULL REFERENCES candidato (id) ON DELETE CASCADE,
    criterio_id  BIGINT       NOT NULL REFERENCES criterio (id),
    atende       BOOLEAN      NOT NULL,
    observacao   VARCHAR(500),
    CONSTRAINT uk_avaliacao_candidato_criterio UNIQUE (candidato_id, criterio_id)
);

-- Quem avaliou e quando (a avaliação mais recente)
ALTER TABLE candidato
    ADD COLUMN avaliado_em     TIMESTAMP,
    ADD COLUMN avaliado_por_id BIGINT REFERENCES usuario (id);
