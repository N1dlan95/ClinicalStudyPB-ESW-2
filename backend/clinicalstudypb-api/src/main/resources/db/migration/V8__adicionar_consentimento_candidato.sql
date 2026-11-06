-- RF10: consentimento simulado do candidato (MER-v2, seção 3.3).
-- Criada na task 3565 porque a inclusão confere o consentimento; o endpoint de registro é da task 3563.
ALTER TABLE candidato
    ADD COLUMN consentimento_registrado_em     TIMESTAMP,
    ADD COLUMN consentimento_registrado_por_id BIGINT REFERENCES usuario (id);
