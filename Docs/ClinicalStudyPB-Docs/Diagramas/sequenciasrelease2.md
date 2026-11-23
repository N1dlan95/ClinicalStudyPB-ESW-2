# ClinicalStudyPB: diagramas de sequência da Release 2

Os dois fluxos novos da Release 2. As rotas são as do [`openapi.yaml`](../api/openapi.yaml) (task 3749) e as tabelas são as do [MER-v3](MER-v3.md). Se uma rota mudar, este documento muda no mesmo PR.

Todas as chamadas, menos o login, levam o token no cabeçalho `Authorization: Bearer <token>`. Um perfil sem permissão recebe 403 `SEM_PERMISSAO` em qualquer rota (omitido nos diagramas).

## 1. Acompanhamento do participante na web (RF12 a RF16)

O coordenador agenda a visita, registra que ela foi realizada, registra os resultados das atividades, consulta o histórico e, por fim, registra a retirada do participante.

```mermaid
sequenceDiagram
    autonumber
    actor C as Coordenador
    participant W as Web
    participant A as API
    participant B as Banco

    Note over C,B: RF12: agendar a visita
    C->>W: Escolhe a visita prevista, a data e o local
    W->>A: POST /candidatos/{id}/visitas
    A->>B: Busca o candidato, o estudo e a visita prevista
    alt Data fora da janela (dataInclusao + diaPrevisto ± janelaDias)
        A-->>W: 400 VALIDACAO (campo dataHora)
        W-->>C: Mostra a janela permitida
    else Visita prevista já agendada
        A-->>W: 409 VISITA_JA_AGENDADA
        W-->>C: Mostra a mensagem
    else Dados válidos
        A->>B: INSERT visita (status AGENDADA)
        A-->>W: 201 Visita
        W-->>C: Visita na agenda
    end

    Note over C,B: RF13: registrar a visita como realizada
    C->>W: Marca a visita como realizada
    W->>A: PATCH /visitas/{id}/status (REALIZADA)
    alt Antes da data e hora marcadas
        A-->>W: 409 VISITA_AINDA_NAO_OCORREU
        W-->>C: Mostra a mensagem
    else Depois do horário
        A->>B: UPDATE visita (status REALIZADA, quem e quando)
        A-->>W: 200 Visita
        W-->>C: Visita realizada
    end

    Note over C,B: RF14: registrar os resultados das atividades
    C->>W: Preenche o resultado de cada atividade
    W->>A: PUT /visitas/{id}/resultados
    alt Visita não realizada
        A-->>W: 409 VISITA_NAO_REALIZADA
        W-->>C: Mostra a mensagem
    else Atividade de outra visita prevista
        A-->>W: 409 ATIVIDADE_FORA_DA_VISITA
        W-->>C: Mostra a mensagem
    else Visita realizada
        A->>B: INSERT ou UPDATE resultado_atividade (em lote)
        A-->>W: 200 ResultadosVisita
        W-->>C: Resultados salvos
    end

    Note over C,B: RF15: consultar o histórico
    C->>W: Abre o histórico do participante
    W->>A: GET /candidatos/{id}/historico
    A->>B: Busca as visitas e os resultados, por data
    A-->>W: 200 Historico
    W-->>C: Linha do tempo de visitas e resultados

    Note over C,B: RF16: registrar a retirada
    C->>W: Informa o motivo e confirma a retirada
    W->>A: POST /candidatos/{id}/retirada
    alt Participante não está INCLUIDO ou já foi retirado
        A-->>W: 409 PARTICIPANTE_NAO_INCLUIDO ou PARTICIPANTE_JA_RETIRADO
        W-->>C: Mostra a mensagem
    else Participante INCLUIDO
        A->>B: UPDATE candidato (status RETIRADO, data, motivo, quem)
        A->>B: UPDATE visitas AGENDADA para CANCELADA ("Retirada do participante")
        A-->>W: 200 Retirada (visitas canceladas e vagas ocupadas)
        W-->>C: Participante retirado, vaga liberada
    end
```

## 2. Login e consulta no app do participante (RF17 e RF18)

O participante entra no app com a conta criada na inclusão, consulta os estudos e as visitas e sai. O app só aceita o perfil PARTICIPANTE.

```mermaid
sequenceDiagram
    autonumber
    actor P as Participante
    participant M as App
    participant A as API

    P->>M: Informa e-mail e senha
    M->>A: POST /auth/login
    alt E-mail ou senha incorretos, ou conta desativada
        A-->>M: 401 CREDENCIAIS_INVALIDAS ou USUARIO_INATIVO
        M-->>P: Mostra a mensagem
    else Login aceito
        A-->>M: 200 token e usuário (com o perfil)
        alt Perfil diferente de PARTICIPANTE
            M-->>P: "Este aplicativo é exclusivo para participantes. Use o sistema web."
        else Perfil PARTICIPANTE
            M->>M: Guarda a sessão
            M->>A: GET /participantes/me/estudos
            A-->>M: 200 Estudos do participante (com a próxima visita)
            M-->>P: Tela Estudos
            P->>M: Abre a aba Visitas
            M->>A: GET /participantes/me/visitas
            A-->>M: 200 Visitas (agendadas, realizadas e ausentes)
            M-->>P: Próximas visitas e histórico de comparecimento
            P->>M: Sai do app
            M->>A: POST /auth/logout
            A-->>M: 204
            M->>M: Apaga a sessão
            M-->>P: Tela de login
        end
    end
```

Se o token vencer durante o uso, qualquer rota responde 401 e o app volta para a tela de login.
