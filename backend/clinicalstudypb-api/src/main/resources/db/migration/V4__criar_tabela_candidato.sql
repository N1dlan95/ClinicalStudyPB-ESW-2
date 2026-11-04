-- RF08: candidatos avaliados para entrar em um estudo (dados fictícios).
-- usuario_id fica vazio até a inclusão gerar a conta do participante (Sprint 3).
CREATE TABLE candidato (
    id              BIGSERIAL    PRIMARY KEY,
    estudo_id       BIGINT       NOT NULL REFERENCES estudo (id),
    nome            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    telefone        VARCHAR(20),
    data_nascimento DATE         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'CADASTRADO',
    usuario_id      BIGINT       REFERENCES usuario (id),
    criado_em       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_candidato_status CHECK (status IN ('CADASTRADO', 'ELEGIVEL', 'INELEGIVEL', 'INCLUIDO', 'RETIRADO'))
);

-- O mesmo e-mail não pode se repetir no mesmo estudo (sem diferenciar maiúsculas)
CREATE UNIQUE INDEX uk_candidato_estudo_email ON candidato (estudo_id, LOWER(email));
CREATE INDEX ix_candidato_estudo_status ON candidato (estudo_id, status);
