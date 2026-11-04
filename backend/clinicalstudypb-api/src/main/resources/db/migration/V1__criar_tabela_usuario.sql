-- RF01: usuários do sistema. Cada usuário tem um único perfil.
CREATE TABLE usuario (
    id            BIGSERIAL    PRIMARY KEY,
    nome          VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    matricula     VARCHAR(50),
    perfil        VARCHAR(20)  NOT NULL,
    senha_hash    VARCHAR(100) NOT NULL,
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('ADMINISTRADOR', 'PESQUISADOR', 'COORDENADOR', 'PARTICIPANTE'))
);

-- E-mail único sem diferenciar maiúsculas de minúsculas
CREATE UNIQUE INDEX uk_usuario_email ON usuario (LOWER(email));
