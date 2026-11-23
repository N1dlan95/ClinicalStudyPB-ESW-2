-- RF16 (task 3768): retirada do participante (MER-v3, seção 3.3), no mesmo padrão do consentimento (V8).
-- O CHECK de status da V4 já aceita RETIRADO.
ALTER TABLE candidato
    ADD COLUMN retirada_registrada_em     TIMESTAMP,
    ADD COLUMN retirada_registrada_por_id BIGINT REFERENCES usuario (id),
    ADD COLUMN motivo_retirada            VARCHAR(500);

-- O seed (V10) já tem candidato RETIRADO sem data nem motivo: preenche para o histórico e o app não
-- mostrarem uma retirada sem data. Quem registrou fica vazio, porque não se sabe.
UPDATE candidato
   SET retirada_registrada_em = atualizado_em,
       motivo_retirada = 'Retirada registrada antes do RF16 (dados de demonstração)'
 WHERE status = 'RETIRADO';
