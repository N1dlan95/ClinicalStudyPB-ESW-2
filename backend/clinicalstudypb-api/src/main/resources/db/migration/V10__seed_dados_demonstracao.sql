-- Task 3542: dados fictícios de demonstração (somente desenvolvimento), para exercitar o recrutamento sem cadastro manual.
-- Cobre estudos em todos os estados (RF07), critérios (RF05), visitas e atividades (RF06) e candidatos em todos
-- os status (RF08 a RF11). Usa os usuários demo da V2 (pesquisador e coordenador). Nenhum dado é real.

-- ---- Estudos (RF04, RF07)
INSERT INTO estudo (titulo, objetivo, responsavel_id, data_inicio, data_fim, limite_participantes, estado)
SELECT v.titulo, v.objetivo, (SELECT id FROM usuario WHERE LOWER(email) = 'pesquisador@clinicalstudypb.test'),
       v.inicio::date, v.fim::date, v.limite, v.estado
FROM (VALUES
    ('Estudo de Hipertensão Arterial em Adultos', 'Avaliar o controle da pressão arterial com acompanhamento estruturado (dados fictícios).', '2026-12-01', '2027-06-30', 40, 'PLANEJAMENTO'),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Medir a adesão ao tratamento com acompanhamento mensal (dados fictícios).', '2026-11-01', '2027-05-31', 4, 'RECRUTAMENTO'),
    ('Estudo de Controle da Asma Leve a Moderada', 'Avaliar a frequência de crises em adultos com plano de ação (dados fictícios).', '2026-10-15', '2027-04-30', 2, 'RECRUTAMENTO'),
    ('Estudo de Qualidade do Sono em Adultos', 'Acompanhar a qualidade do sono após orientação de higiene do sono (dados fictícios).', '2026-09-01', '2027-02-28', 10, 'EXECUCAO'),
    ('Estudo Piloto de Reabilitação Pós-AVC', 'Verificar a evolução funcional com reabilitação supervisionada (dados fictícios).', '2026-03-01', '2026-08-31', 8, 'ENCERRADO')
) AS v(titulo, objetivo, inicio, fim, limite, estado);

-- ---- Critérios de inclusão e exclusão (RF05)
INSERT INTO criterio (estudo_id, tipo, descricao, ordem)
SELECT e.id, c.tipo, c.descricao, c.ordem
FROM (VALUES
    ('Estudo de Hipertensão Arterial em Adultos', 'INCLUSAO', 1, 'Idade entre 18 e 65 anos'),
    ('Estudo de Hipertensão Arterial em Adultos', 'INCLUSAO', 2, 'Diagnóstico de hipertensão arterial confirmado'),
    ('Estudo de Hipertensão Arterial em Adultos', 'EXCLUSAO', 1, 'Gestação ou lactação'),
    ('Estudo de Hipertensão Arterial em Adultos', 'EXCLUSAO', 2, 'Doença renal crônica avançada'),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'INCLUSAO', 1, 'Idade igual ou superior a 18 anos'),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'INCLUSAO', 2, 'Diagnóstico de diabetes tipo 2 há mais de 6 meses'),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'EXCLUSAO', 1, 'Uso de insulina'),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'EXCLUSAO', 2, 'Gestação'),
    ('Estudo de Controle da Asma Leve a Moderada', 'INCLUSAO', 1, 'Idade entre 18 e 60 anos'),
    ('Estudo de Controle da Asma Leve a Moderada', 'INCLUSAO', 2, 'Diagnóstico de asma leve a moderada'),
    ('Estudo de Controle da Asma Leve a Moderada', 'EXCLUSAO', 1, 'Tabagismo atual'),
    ('Estudo de Qualidade do Sono em Adultos', 'INCLUSAO', 1, 'Queixa de insônia há mais de 3 meses'),
    ('Estudo de Qualidade do Sono em Adultos', 'EXCLUSAO', 1, 'Trabalho em turnos noturnos'),
    ('Estudo Piloto de Reabilitação Pós-AVC', 'INCLUSAO', 1, 'AVC isquêmico há mais de 3 meses'),
    ('Estudo Piloto de Reabilitação Pós-AVC', 'EXCLUSAO', 1, 'Incapacidade de deambular')
) AS c(titulo, tipo, ordem, descricao)
JOIN estudo e ON e.titulo = c.titulo;

-- ---- Visitas previstas e atividades (RF06): o mesmo roteiro de 3 visitas nos estudos de demonstração
INSERT INTO visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias, descricao)
SELECT e.id, v.ordem, v.nome, v.dia, v.janela, v.descricao
FROM estudo e
CROSS JOIN (VALUES
    (1, 'Triagem', 0, 0, 'Avaliação inicial do participante'),
    (2, 'Seguimento de 30 dias', 30, 3, 'Acompanhamento do primeiro mês'),
    (3, 'Visita final', 90, 7, 'Encerramento do acompanhamento')
) AS v(ordem, nome, dia, janela, descricao)
WHERE e.titulo IN ('Estudo de Hipertensão Arterial em Adultos', 'Estudo de Adesão ao Tratamento do Diabetes Tipo 2',
                   'Estudo de Controle da Asma Leve a Moderada', 'Estudo de Qualidade do Sono em Adultos',
                   'Estudo Piloto de Reabilitação Pós-AVC');

INSERT INTO atividade (visita_prevista_id, ordem, descricao)
SELECT vp.id, a.ordem, a.descricao
FROM visita_prevista vp
JOIN estudo e ON e.id = vp.estudo_id
CROSS JOIN (VALUES
    (1, 'Aferição de sinais vitais'),
    (2, 'Aplicação de questionário de saúde')
) AS a(ordem, descricao)
WHERE e.titulo IN ('Estudo de Hipertensão Arterial em Adultos', 'Estudo de Adesão ao Tratamento do Diabetes Tipo 2',
                   'Estudo de Controle da Asma Leve a Moderada', 'Estudo de Qualidade do Sono em Adultos',
                   'Estudo Piloto de Reabilitação Pós-AVC');

-- ---- Candidatos (RF08 a RF11): um em cada status. "consentiu" marca quem já registrou o consentimento.
INSERT INTO candidato (estudo_id, nome, email, telefone, data_nascimento, status,
                       avaliado_em, avaliado_por_id, consentimento_registrado_em, consentimento_registrado_por_id, data_inclusao)
SELECT e.id, c.nome, c.email, c.telefone, c.nascimento::date, c.status,
       CASE WHEN c.status <> 'CADASTRADO' THEN TIMESTAMP '2026-11-03 10:00:00' END,
       CASE WHEN c.status <> 'CADASTRADO' THEN (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test') END,
       CASE WHEN c.consentiu THEN TIMESTAMP '2026-11-04 14:30:00' END,
       CASE WHEN c.consentiu THEN (SELECT id FROM usuario WHERE LOWER(email) = 'coordenador@clinicalstudypb.test') END,
       c.inclusao::date
FROM (VALUES
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Marcos Oliveira', 'marcos.oliveira@exemplo.test', '(83) 99999-0001', '1985-03-12', 'CADASTRADO', FALSE, NULL),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Fernanda Lima', 'fernanda.lima@exemplo.test', '(83) 99999-0002', '1979-07-25', 'ELEGIVEL', FALSE, NULL),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Rafael Souza', 'rafael.souza@exemplo.test', '(83) 99999-0003', '1990-11-02', 'ELEGIVEL', TRUE, NULL),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Juliana Costa', 'juliana.costa@exemplo.test', '(83) 99999-0004', '1988-01-19', 'INELEGIVEL', FALSE, NULL),
    ('Estudo de Adesão ao Tratamento do Diabetes Tipo 2', 'Pedro Alves', 'pedro.alves@exemplo.test', '(83) 99999-0005', '1972-09-08', 'INCLUIDO', TRUE, '2026-11-05'),
    ('Estudo de Controle da Asma Leve a Moderada', 'Camila Rocha', 'camila.rocha@exemplo.test', '(83) 99999-0006', '1994-04-30', 'INCLUIDO', TRUE, '2026-11-03'),
    ('Estudo de Controle da Asma Leve a Moderada', 'Bruno Martins', 'bruno.martins@exemplo.test', '(83) 99999-0007', '1983-12-14', 'INCLUIDO', TRUE, '2026-11-04'),
    ('Estudo de Controle da Asma Leve a Moderada', 'Larissa Gomes', 'larissa.gomes@exemplo.test', '(83) 99999-0008', '1991-06-21', 'ELEGIVEL', TRUE, NULL),
    ('Estudo de Controle da Asma Leve a Moderada', 'Tiago Ribeiro', 'tiago.ribeiro@exemplo.test', '(83) 99999-0009', '1986-02-05', 'CADASTRADO', FALSE, NULL),
    ('Estudo de Qualidade do Sono em Adultos', 'Helena Barbosa', 'helena.barbosa@exemplo.test', '(83) 99999-0010', '1980-08-17', 'INCLUIDO', TRUE, '2026-09-10'),
    ('Estudo de Qualidade do Sono em Adultos', 'Gustavo Pereira', 'gustavo.pereira@exemplo.test', '(83) 99999-0011', '1975-05-29', 'INCLUIDO', TRUE, '2026-09-12'),
    ('Estudo de Qualidade do Sono em Adultos', 'Renata Dias', 'renata.dias@exemplo.test', '(83) 99999-0012', '1992-10-03', 'RETIRADO', TRUE, '2026-09-15'),
    ('Estudo Piloto de Reabilitação Pós-AVC', 'Antônio Ferreira', 'antonio.ferreira@exemplo.test', '(83) 99999-0013', '1958-03-22', 'INCLUIDO', TRUE, '2026-03-20'),
    ('Estudo Piloto de Reabilitação Pós-AVC', 'Sônia Carvalho', 'sonia.carvalho@exemplo.test', '(83) 99999-0014', '1961-12-09', 'INCLUIDO', TRUE, '2026-03-22')
) AS c(titulo, nome, email, telefone, nascimento, status, consentiu, inclusao)
JOIN estudo e ON e.titulo = c.titulo;

-- ---- Avaliação dos critérios (RF09) dos candidatos já avaliados.
-- Elegível: atende a todos os critérios de inclusão e a nenhum de exclusão. O inelegível falha no primeiro critério de inclusão.
INSERT INTO avaliacao_criterio (candidato_id, criterio_id, atende, observacao)
SELECT c.id, k.id,
       CASE WHEN c.status = 'INELEGIVEL' THEN (k.tipo = 'INCLUSAO' AND k.ordem <> 1) ELSE (k.tipo = 'INCLUSAO') END,
       CASE WHEN c.status = 'INELEGIVEL' AND k.tipo = 'INCLUSAO' AND k.ordem = 1 THEN 'Não atende ao critério' END
FROM candidato c
JOIN criterio k ON k.estudo_id = c.estudo_id
WHERE c.email LIKE '%@exemplo.test' AND c.status <> 'CADASTRADO';
