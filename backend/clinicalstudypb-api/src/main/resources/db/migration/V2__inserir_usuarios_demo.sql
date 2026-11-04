-- Usuários fictícios para demonstração, um por perfil.
-- Senha de todos: Senha@123 (hash BCrypt abaixo). Somente para desenvolvimento.
INSERT INTO usuario (nome, email, matricula, perfil, senha_hash) VALUES
    ('Administrador Demo', 'admin@clinicalstudypb.test',        'ADM-001', 'ADMINISTRADOR', '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6'),
    ('Ana Pesquisadora',   'pesquisador@clinicalstudypb.test',  'PES-001', 'PESQUISADOR',   '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6'),
    ('Carlos Coordenador', 'coordenador@clinicalstudypb.test',  'COO-001', 'COORDENADOR',   '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6'),
    ('Paula Participante', 'participante@clinicalstudypb.test', NULL,      'PARTICIPANTE',  '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6');
