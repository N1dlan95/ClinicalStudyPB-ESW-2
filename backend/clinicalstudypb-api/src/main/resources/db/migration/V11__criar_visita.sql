-- RF12/RF13 (tasks 3755 e 3758): visita agendada para um participante, a partir de uma visita prevista do protocolo (RF06).
-- O participante é o candidato INCLUIDO (candidato_id): assim a visita fica presa ao estudo em que ele foi incluído,
-- e a conta de acesso dele (candidato.usuario_id, task 3751) chega às visitas pelo candidato.
CREATE TABLE visita (
    id                       BIGSERIAL    PRIMARY KEY,
    candidato_id             BIGINT       NOT NULL REFERENCES candidato (id),
    visita_prevista_id       BIGINT       NOT NULL REFERENCES visita_prevista (id),
    data_hora                TIMESTAMP    NOT NULL,
    local                    VARCHAR(120),
    status                   VARCHAR(20)  NOT NULL DEFAULT 'AGENDADA',
    observacao               VARCHAR(500),
    agendada_por_id          BIGINT       NOT NULL REFERENCES usuario (id),
    status_registrado_em     TIMESTAMP,
    status_registrado_por_id BIGINT       REFERENCES usuario (id),
    criado_em                TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_visita_status CHECK (status IN ('AGENDADA', 'REALIZADA', 'AUSENTE', 'CANCELADA'))
);

-- Uma visita prevista só pode ter um agendamento ativo por participante; a cancelada libera um novo agendamento
CREATE UNIQUE INDEX uk_visita_ativa_por_prevista ON visita (candidato_id, visita_prevista_id) WHERE status <> 'CANCELADA';
CREATE INDEX ix_visita_candidato_data ON visita (candidato_id, data_hora);
CREATE INDEX ix_visita_prevista ON visita (visita_prevista_id);
-- Usado pelo app do participante (RF17/RF18) para achar os estudos e as visitas da conta
CREATE INDEX ix_candidato_usuario ON candidato (usuario_id);
