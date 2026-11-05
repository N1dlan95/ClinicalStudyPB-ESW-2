-- RF11: data em que o candidato foi incluído no estudo (MER-v2, seção 3.3)
ALTER TABLE candidato
    ADD COLUMN data_inclusao DATE;
