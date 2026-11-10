-- RF05: critérios de inclusão e exclusão de cada estudo (MER-v2, seção 3.1).
-- Criada na task 3560 porque a avaliação de elegibilidade depende dela; os endpoints de critério são da task 3550.
CREATE TABLE criterio (
    id            BIGSERIAL    PRIMARY KEY,
    estudo_id     BIGINT       NOT NULL REFERENCES estudo (id),
    tipo          VARCHAR(10)  NOT NULL,
    descricao     VARCHAR(500) NOT NULL,
    ordem         INTEGER      NOT NULL,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_criterio_tipo CHECK (tipo IN ('INCLUSAO', 'EXCLUSAO')),
    CONSTRAINT ck_criterio_ordem CHECK (ordem > 0),
    CONSTRAINT uk_criterio_estudo_tipo_ordem UNIQUE (estudo_id, tipo, ordem)
);
