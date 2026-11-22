-- Task 3750 (T-84): dados fictícios de demonstração da Release 2 (somente desenvolvimento), para a demo, o E2E e
-- o login no app do participante. Nenhum dado é real.
--
-- Usa o "Estudo de Qualidade do Sono em Adultos" da V10, que já está em EXECUCAO com 3 visitas previstas
-- (Triagem D0 ±0, Seguimento de 30 dias D30 ±3, Visita final D90 ±7) e 2 atividades em cada uma.
-- Cria 4 participantes com conta PARTICIPANTE vinculada (candidato.usuario_id):
--   * Paula Participante (conta da V2), Lucas Mendes e Beatriz Santos: INCLUIDO;
--   * Otávio Nunes: RETIRADO, com motivo e data.
-- Visitas em todos os status: REALIZADA com resultados, AUSENTE, CANCELADA com motivo e AGENDADA no futuro.
--
-- As datas são relativas a CURRENT_DATE (dia em que a migração roda): os participantes foram incluídos há 28 dias,
-- então a Triagem foi há 28 dias, o Seguimento de 30 dias cai entre ontem e daqui a 5 dias e a Visita final entre
-- 55 e 69 dias. Assim as visitas agendadas não ficam no passado e respeitam as janelas do protocolo.
-- Senha de todas as contas: Senha@123 (mesmo hash BCrypt da V2).

-- ---- Contas dos participantes novos (a da Paula já existe desde a V2)
INSERT INTO usuario (nome, email, matricula, perfil, senha_hash) VALUES
    ('Lucas Mendes',   'participante2@clinicalstudypb.test', NULL, 'PARTICIPANTE', '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6'),
    ('Beatriz Santos', 'participante3@clinicalstudypb.test', NULL, 'PARTICIPANTE', '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6'),
    ('Otávio Nunes',   'participante4@clinicalstudypb.test', NULL, 'PARTICIPANTE', '$2a$10$otOiV.gCvFvhYUEHYfvs2Ox0nS0zlxA6USD6vmXqckywvKIv5Imt6');

-- ---- Participantes (RF08 a RF11 + conta da task 3751): avaliados, com consentimento e incluídos há 28 dias
INSERT INTO candidato (estudo_id, nome, email, telefone, data_nascimento, status, usuario_id,
                       avaliado_em, avaliado_por_id, consentimento_registrado_em, consentimento_registrado_por_id,
                       data_inclusao)
SELECT e.id, u.nome, u.email, p.telefone, p.nascimento::date, 'INCLUIDO', u.id,
       (CURRENT_DATE - 30) + TIME '10:00', coord.id,
       (CURRENT_DATE - 29) + TIME '14:30', coord.id,
       CURRENT_DATE - 28
FROM (VALUES
    ('participante@clinicalstudypb.test',  '(83) 99999-0101', '1987-04-16'),
    ('participante2@clinicalstudypb.test', '(83) 99999-0102', '1979-09-03'),
    ('participante3@clinicalstudypb.test', '(83) 99999-0103', '1995-01-27'),
    ('participante4@clinicalstudypb.test', '(83) 99999-0104', '1983-06-11')
) AS p(email, telefone, nascimento)
JOIN usuario u ON LOWER(u.email) = p.email
CROSS JOIN (SELECT id FROM estudo WHERE titulo = 'Estudo de Qualidade do Sono em Adultos') AS e
CROSS JOIN (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test') AS coord;

-- Avaliação dos critérios (RF09): elegíveis, atendem à inclusão e não à exclusão
INSERT INTO avaliacao_criterio (candidato_id, criterio_id, atende, observacao)
SELECT c.id, k.id, (k.tipo = 'INCLUSAO'), NULL
FROM candidato c
JOIN criterio k ON k.estudo_id = c.estudo_id
WHERE c.email LIKE 'participante%@clinicalstudypb.test';

-- ---- Visitas (RF12 e RF13)
-- "dias" é o deslocamento em relação a hoje; o status final guarda quem registrou (o coordenador demo) e quando
INSERT INTO visita (candidato_id, visita_prevista_id, data_hora, local, status, observacao, agendada_por_id,
                    status_registrado_em, status_registrado_por_id)
SELECT c.id, vp.id, (CURRENT_DATE + v.dias) + v.hora, v.local, v.status, v.observacao, coord.id,
       -- Realizada e ausente: registradas logo depois do horário da visita. Cancelada: registrada ontem
       CASE v.status WHEN 'AGENDADA' THEN NULL
                     WHEN 'CANCELADA' THEN (CURRENT_DATE - 1) + TIME '16:00'
                     ELSE (CURRENT_DATE + v.dias) + v.hora + INTERVAL '1 hour' END,
       CASE WHEN v.status <> 'AGENDADA' THEN coord.id END
FROM (VALUES
    -- Paula: triagem realizada, seguimento e visita final agendados
    ('participante@clinicalstudypb.test',  1, -28, TIME '09:00', 'Consultório 1', 'REALIZADA', NULL),
    ('participante@clinicalstudypb.test',  2,   2, TIME '09:30', 'Consultório 1', 'AGENDADA',  NULL),
    ('participante@clinicalstudypb.test',  3,  60, TIME '10:00', 'Consultório 2', 'AGENDADA',  NULL),
    -- Lucas: triagem realizada, faltou ao seguimento, visita final agendada
    ('participante2@clinicalstudypb.test', 1, -28, TIME '10:00', 'Consultório 1', 'REALIZADA', NULL),
    ('participante2@clinicalstudypb.test', 2,  -1, TIME '08:30', 'Consultório 1', 'AUSENTE',   'Participante não compareceu e não avisou'),
    ('participante2@clinicalstudypb.test', 3,  62, TIME '08:30', 'Consultório 2', 'AGENDADA',  NULL),
    -- Beatriz: triagem realizada, seguimento cancelado e reagendado (o cancelamento libera um novo agendamento)
    ('participante3@clinicalstudypb.test', 1, -28, TIME '11:00', 'Consultório 1', 'REALIZADA', NULL),
    ('participante3@clinicalstudypb.test', 2,   1, TIME '14:00', 'Consultório 1', 'CANCELADA', 'Participante pediu outra data por motivo de viagem'),
    ('participante3@clinicalstudypb.test', 2,   4, TIME '14:00', 'Consultório 1', 'AGENDADA',  NULL),
    -- Otávio: triagem realizada; o seguimento foi cancelado pela retirada (como faz o RetiradaService)
    ('participante4@clinicalstudypb.test', 1, -28, TIME '15:00', 'Consultório 1', 'REALIZADA', NULL),
    ('participante4@clinicalstudypb.test', 2,   3, TIME '15:00', 'Consultório 1', 'CANCELADA', 'Retirada do participante')
) AS v(email, ordem, dias, hora, local, status, observacao)
JOIN candidato c ON LOWER(c.email) = v.email
JOIN visita_prevista vp ON vp.estudo_id = c.estudo_id AND vp.ordem = v.ordem
CROSS JOIN (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test') AS coord
WHERE c.estudo_id = (SELECT id FROM estudo WHERE titulo = 'Estudo de Qualidade do Sono em Adultos');

-- ---- Resultados fictícios das atividades das visitas realizadas (RF14)
INSERT INTO resultado_atividade (visita_id, atividade_id, resultado, observacao, registrado_por_id, registrado_em)
SELECT vi.id, a.id, r.resultado, r.observacao, coord.id, vi.data_hora + INTERVAL '1 hour'
FROM (VALUES
    ('participante@clinicalstudypb.test',  1, 'PA 122x80 mmHg, FC 72 bpm',         NULL),
    ('participante@clinicalstudypb.test',  2, 'Índice de qualidade do sono: 11 pontos', 'Relata dificuldade para iniciar o sono'),
    ('participante2@clinicalstudypb.test', 1, 'PA 130x85 mmHg, FC 78 bpm',         NULL),
    ('participante2@clinicalstudypb.test', 2, 'Índice de qualidade do sono: 14 pontos', 'Acorda várias vezes durante a noite'),
    ('participante3@clinicalstudypb.test', 1, 'PA 115x75 mmHg, FC 68 bpm',         NULL),
    ('participante3@clinicalstudypb.test', 2, 'Índice de qualidade do sono: 9 pontos',  NULL),
    ('participante4@clinicalstudypb.test', 1, 'PA 126x82 mmHg, FC 74 bpm',         NULL),
    ('participante4@clinicalstudypb.test', 2, 'Índice de qualidade do sono: 12 pontos', NULL)
) AS r(email, atividade_ordem, resultado, observacao)
JOIN candidato c ON LOWER(c.email) = r.email
JOIN visita vi ON vi.candidato_id = c.id AND vi.status = 'REALIZADA'
JOIN atividade a ON a.visita_prevista_id = vi.visita_prevista_id AND a.ordem = r.atividade_ordem
CROSS JOIN (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test') AS coord
WHERE c.estudo_id = (SELECT id FROM estudo WHERE titulo = 'Estudo de Qualidade do Sono em Adultos');

-- ---- Retirada do Otávio (RF16): motivo e data; a conta continua ativa, como no RetiradaService
UPDATE candidato
   SET status = 'RETIRADO',
       retirada_registrada_em = (CURRENT_DATE - 1) + TIME '16:00',
       retirada_registrada_por_id = (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test'),
       motivo_retirada = 'Mudou de cidade e não consegue continuar as visitas'
 WHERE LOWER(email) = 'participante4@clinicalstudypb.test'
   AND estudo_id = (SELECT id FROM estudo WHERE titulo = 'Estudo de Qualidade do Sono em Adultos');
