# ClinicalStudyPB: fluxo de recrutamento

```mermaid
flowchart TD
    subgraph COORDENADOR["Ator: COORDENADOR"]
        A["Cadastrar candidato vinculado ao estudo"]
        D["Avaliar critérios de inclusão e exclusão"]
        G["Registrar consentimento do candidato"]
        J["Solicitar inclusão do candidato"]
    end

    subgraph SISTEMA["Ator: sistema"]
        B{"Estudo está em recrutamento?"}
        C["Erro: estudo fora de recrutamento"]
        E["Avaliar todos os critérios"]
        F{"Candidato elegível?"}
        H["Erro: candidato não elegível"]
        I{"Consentimento registrado?"}
        K["Erro: sem consentimento"]
        L{"Estudo está em recrutamento?"}
        M["Erro: estudo fora de recrutamento"]
        N{"Há vaga disponível?"}
        O["Erro: vagas esgotadas"]
        P["Incluir candidato<br/>status INCLUIDO e data_inclusao"]
        Q["Fim do fluxo"]
    end

    A --> B
    B -->|"Não"| C --> Q
    B -->|"Sim"| D
    D --> E
    E --> F
    F -->|"Não<br/>não atende todos os critérios de inclusão<br/>ou atende algum critério de exclusão"| H --> Q
    F -->|"Sim<br/>atende todos os critérios de inclusão<br/>e nenhum critério de exclusão"| G
    G --> J
    J --> L
    L -->|"Não"| M --> Q
    L -->|"Sim"| I
    I -->|"Não"| K --> Q
    I -->|"Sim"| N
    N -->|"Não"| O --> Q
    N -->|"Sim"| P --> Q
```

O candidato é cadastrado pelo COORDENADOR quando o estudo está em recrutamento. O sistema avalia todos os critérios configurados, considerando elegível quem atende a todos os critérios de inclusão e a nenhum critério de exclusão. Candidatos elegíveis seguem para o registro do consentimento e, depois, para a inclusão, que só ocorre com o estudo em recrutamento, com consentimento registrado e com vaga disponível.
