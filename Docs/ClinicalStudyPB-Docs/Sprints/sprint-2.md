---
tags:
  - sprint
  - clinicalstudypb
  - eng-sw-2
sprint: 2
release: 1
inicio: 2026-10-27
fim: 2026-11-09
lider-da-sprint: Mirelle Casimiro Silvino
status: concluído
---

# Sprint 2 — ClinicalStudyPB

> [!info] Navegação
> Release 1 (Sprints 1 e 2) · Entrega em 10/11/2026 · Anterior: [[sprint-1]]

## 1. Contexto geral

- **Projeto:** ClinicalStudyPB, sistema simplificado de gestão do ciclo de vida de estudos clínicos (dados fictícios, sem decisão clínica automatizada).
- **Release 1 — Estrutura e recrutamento:** aplicação web funcional que permite cadastrar um estudo, avaliar candidatos e incluir participantes.
- **Objetivo da Sprint 2:** entregar os requisitos **RF05 a RF11** (recrutamento), fechar as pendências da Sprint 1 (RF04 e qualidade), comprovar cobertura de testes ≥ 80% das linhas de negócio do backend e preparar a entrega da Release 1.
- **Fora do escopo:** funcionalidades da Release 2 e evolução do app mobile (congelado nesta release, ver T-43d).
- **Rotação de papéis:** cada integrante assume um papel diferente a cada sprint. O papel define o foco, mas testes, documentação e revisão de código são **compartilhados** (exigência do projeto).

### Requisitos da sprint

| ID | Requisito | PBI no Azure |
| --- | --- | --- |
| RF05 | Critérios de inclusão e exclusão | 3521 |
| RF06 | Visitas previstas e atividades | 3522 |
| RF07 | Estados do estudo | 3524 |
| RF08 | Cadastro de candidatos | 3525 |
| RF09 | Avaliação de elegibilidade | 3526 |
| RF10 | Consentimento simulado | 3527 |
| RF11 | Inclusão com limite de vagas | 3528 |
| RF04 / Qualidade | Pendências da Sprint 1 | 3520 |

### Equipe e papéis nesta sprint

| # | Papel | Responsável | Foco | Horas planejadas |
| --- | --- | --- | --- | --- |
| 1 | Gerente | Mirelle | Coordenação da sprint, backend de visitas (RF06) e estados (RF07), contrato OpenAPI, Swagger UI e README | 35h |
| 2 | Desenvolvedor Backend | Maria Eduarda | MER/DER, backend de candidatos (RF08), elegibilidade (RF09) e inclusão (RF11), testes do recrutamento | 37h |
| 3 | Desenvolvedor Web 1 | Nidlan Hendell | Protótipo e telas de critérios, visitas, estado do estudo e elegibilidade; testes de componente; capturas de tela | 40h |
| 4 | Desenvolvedor Web 2 | Jasmine | Integração dos estudos à API (RF04), protótipo do recrutamento, telas de candidatos, consentimento e inclusão; testes | 38h |
| 5 | Desenvolvedor Mobile | Arthur | Mobile congelado nesta sprint; CI e cobertura, migração e seed, backend de critérios (RF05) e consentimento (RF10), testes de integração | 25h |
| 6 | QA | Adrielly | QA: testes E2E, CI, relatório de cobertura, regressão e bug bash; testes do cadastro de estudos; credenciais; tag e Release | 28h |
| | | **Total** | | **203h** |

> [!info] Rotação
> Na Sprint 1 os papéis eram: Líder/Gerente Nidlan Hendell, Backend Maria Eduarda, Web (estudos) Mirelle, Web (usuários) Adrielly, Mobile Jasmine e QA/DevOps Arthur.

## 2. Duração da sprint

- **Período:** 27/10/2026 a 09/11/2026 (02/11 é feriado)
- **Planning:** 27/10
- **Prazos internos:** 29/10 (resposta da professora, task 3534) e 30/10 (contrato OpenAPI, task 3543)
- **Checkpoint intermediário:** 03/11
- **Feature freeze e bug bash:** 06/11
- **Review, retrospectiva e fechamento da Release 1:** 09/11 (capturas de tela, tag e GitHub Release); entrega em 10/11
- **Gerenciamento:** board e burndown no Azure DevOps, no máximo 2 tasks em Doing por pessoa

## 3. Backlog da sprint (PBI > Task)

> [!tip] Convenção
> Número = ID da task no Azure DevOps · Responsável · Horas estimadas · Início → fim previsto (dia em que vai para Done, com PR revisado e Remaining Work = 0).

### 3518 — Fechar dúvidas e modelo de dados de RF05–RF11 (Preparação)

- [x] **3533** Planejar a sprint: separar, organizar e distribuir as atividades · Mirelle · 3h · 27/10 → 27/10
- [ ] **3534** Tirar dúvidas sobre a entidade Critério (RF05) e o registro da elegibilidade · Mirelle · 1h · 27/10 → 27/10 *(não há resposta registrada: as dúvidas 1 e 2 seguiram como premissa no [[MER-v2]], conforme o plano B da seção 5)*
- [x] **3536** Diagrama de atividade do fluxo de recrutamento (candidato > elegibilidade > consentimento > inclusão) · Mirelle · 3h · 28/10 → 29/10
- [x] **3538** Atualizar o MER/DER com as entidades de RF05 a RF11 · Maria Eduarda · 6h · 27/10 → 28/10
- [x] **3539** Revisão do DER por outro integrante (revisão cruzada) · Mirelle · 1h · 29/10 → 29/10 *(a revisão foi feita pela Adrielly no PR #22, mesclado em 04/11)*
- [x] **3542** Criar scripts de migração e seed com dados fictícios · Arthur · 4h · 28/10 → 29/10
- [x] **3543** Atualizar o contrato OpenAPI para RF05–RF11 · Mirelle · 3h · 28/10 → 28/10

### 3520 — Concluir as pendências da Sprint 1 (RF04 / Qualidade)

- [x] **3545** Integrar as telas web de estudos à API e ajustar ao OpenAPI (fecha o RF04) · Jasmine · 5h · 27/10 → 28/10
- [x] **3546** Sincronizar develop: trazer cobertura (JaCoCo + Vitest) do PR #9 e mergear CI (feature/3049) · Arthur · 3h · 27/10 → 28/10
- [x] **3548** Corrigir o board da Sprint 1: fechar 3153 e 3223, mover 3236 e 3237 como pendência e atualizar épicos · Mirelle · 1h · 27/10 → 27/10
- [x] **T-43d (sem ID no board)** Congelar o app mobile: não evoluir as telas de estudos, visitas e retirada (RF17–RF20) e registrá-las no README da release · Arthur · 1h · 27/10 → 27/10
- [x] **3641** Sincronizar develop com a master antes da entrega (PRs #1, #2 e #9) · Arthur · 1h · 28/10 → 28/10
- [x] **3692** Corrigir permissões de estudos na web para que o pesquisador cadastre e edite (RF04) · Nidlan Hendell · 1h · 27/10 → 27/10

### 3224 — Gestão de estudos (RF04)

- [x] **3236** Testes unitários, de integração e de componente do cadastro de estudos · Adrielly · 5h · 30/10 → 04/11

### 3521 — Critérios de inclusão e exclusão (RF05)

- [x] **3549** Protótipo navegável: critérios de inclusão/exclusão e visitas previstas, com estados de erro · Nidlan Hendell · 6h · 27/10 → 28/10
- [x] **3550** Backend: entidade Critério, vínculo com o estudo, validações e endpoints · Arthur · 8h · 29/10 → 30/10
- [x] **3551** Web: tela de critérios integrada à API · Nidlan Hendell · 8h · 28/10 → 03/11

### 3522 — Visitas previstas e atividades (RF06)

- [x] **3552** Backend: visita prevista e atividades (ordem, descrição, validações) e endpoints · Mirelle · 8h · 30/10 → 04/11
- [x] **3553** Web: tela de visitas previstas e atividades integrada à API · Nidlan Hendell · 8h · 30/10 → 04/11

### 3524 — Estados do estudo (RF07)

- [x] **3554** Backend: transições válidas entre estados, endpoint de mudança de estado e regras por estado · Mirelle · 6h · 29/10 → 30/10
- [x] **3555** Web: controle do estado do estudo na tela de detalhe · Nidlan Hendell · 4h · 29/10 → 03/11
- [x] **3556** Testes unitários: critérios, visitas previstas e transições de estado · Mirelle · 3h · 03/11 → 04/11
- [x] **3556** Testes unitários: critérios, visitas previstas e transições de estado · Maria Eduarda · 3h · 05/11 → 05/11 *(a parte prevista para a Maria Eduarda foi feita pela Adrielly no PR #34, em 06/11)*

### 3525 — Cadastro de candidatos (RF08)

- [x] **3557** Protótipo navegável: candidatos, avaliação, consentimento e inclusão, com estados de erro (vagas esgotadas, sem consentimento, não elegível) · Jasmine · 8h · 27/10 → 29/10
- [x] **3558** Backend: entidade Candidato vinculada ao estudo, validações e endpoints · Maria Eduarda · 8h · 28/10 → 30/10
- [x] **3559** Web: telas de listagem e cadastro de candidatos integradas à API · Jasmine · 8h · 29/10 → 03/11

### 3526 — Avaliação de elegibilidade (RF09)

- [x] **3560** Backend: avaliação dos critérios e resultado (elegível / não elegível) · Maria Eduarda · 8h · 30/10 → 03/11
- [x] **3561** Web: tela de avaliação de elegibilidade · Nidlan Hendell · 8h · 04/11 → 05/11

### 3527 — Consentimento simulado (RF10)

- [x] **3563** Backend: registro de consentimento (data, vínculo com candidato e estudo) · Arthur · 4h · 03/11 → 03/11
- [x] **3564** Web: registro de consentimento · Jasmine · 4h · 03/11 → 04/11

### 3528 — Inclusão com limite de vagas (RF11)

- [x] **3565** Backend: inclusão (exige elegível + consentimento + vaga disponível + estudo em recrutamento) · Maria Eduarda · 8h · 03/11 → 05/11
- [x] **3566** Web: ação de incluir e mensagens de erro/validação · Jasmine · 5h · 04/11 → 05/11
- [x] **3567** Testes unitários e de integração do recrutamento (elegibilidade, consentimento, limite de vagas) · Jasmine · 4h · 05/11 → 06/11
- [x] **3568** Testes unitários e de integração do recrutamento (elegibilidade, consentimento, limite de vagas) · Maria Eduarda · 4h · 06/11 → 06/11

### 3529 — Testes automatizados e cobertura (Qualidade)

- [x] **3570** Testes de integração dos endpoints de RF05–RF11 · Adrielly · 4h · 03/11 → 05/11
- [x] **3570** Testes de integração dos endpoints de RF05–RF11 · Arthur · 4h · 04/11 → 04/11
- [x] **3571** Testes de componente web: critérios, visitas e candidatos · Nidlan Hendell · 3h · 06/11 → 06/11 *(testes de `CriteriosPage`, `VisitasPrevistasPage`, `EstadoEstudoPage` e `AvaliacaoElegibilidadePage`, nos commits `a70ed79` e `5a62af5` de 09/11, sem `AB#`)*
- [x] **3572** Testes de componente web: critérios, visitas e candidatos · Jasmine · 3h · 05/11 → 05/11
- [x] **3574** Teste E2E web: cadastrar estudo > cadastrar candidato > avaliar > consentir > incluir · Adrielly · 8h · 27/10 → 05/11
- [x] **3575** Garantir CI executando testes e cobertura a cada PR (depois da 3546) · Adrielly · 3h · 29/10 → 29/10
- [x] **3576** Relatório de testes e evidência de cobertura ≥ 80% das linhas de negócio do backend · Adrielly · 3h · 29/10 → 06/11
- [x] **3577** Roteiro de regressão de RF01–RF04 e condução do bug bash (06/11) · Adrielly · 2h · 30/10 → 06/11

### 3530 — Entrega da Release 1 (Entrega)

- [x] **3580** Swagger UI com RF01–RF11: adicionar springdoc-openapi ao backend e documentar os endpoints · Mirelle · 3h · 05/11 → 05/11
- [x] **3581** README principal: apresentação, arquitetura, funcionalidades, stack, instalação, testes e API (corrigir UTF-8) · Mirelle · 3h · 05/11 → 06/11
- [x] **3583** Capturas de tela das interfaces web (sucesso e erro/validação) · Nidlan Hendell · 2h · 09/11 → 09/11
- [x] **3584** Capturas de tela das interfaces web (sucesso e erro/validação) · Jasmine · 1h · 09/11 → 09/11
- [x] **3585** Documentar credenciais fictícias por perfil · Adrielly · 1h · 30/10 → 30/10
- [x] **3586** Merge da develop na master, tag release1 e GitHub Release com resumo e link do README · Adrielly · 2h · 09/11 → 09/11

### Tarefas compartilhadas (todos)

- [x] Revisão de código cruzada em todos os PRs (mínimo 1 revisor)
- [x] Documentação da sprint (parte de cada um)
- [x] Preparar a demonstração da Release 1

## 4. Distribuição por membro

| # | Papel | Responsável | Horas | Tasks |
| --- | --- | --- | --- | --- |
| 1 | Gerente | Mirelle | 35h | 3533, 3534, 3536, 3539, 3543, 3548, 3552, 3554, 3556, 3580, 3581 |
| 2 | Desenvolvedor Backend | Maria Eduarda | 37h | 3538, 3556, 3558, 3560, 3565, 3568 |
| 3 | Desenvolvedor Web 1 | Nidlan Hendell | 40h | 3692, 3549, 3551, 3553, 3555, 3561, 3571, 3583 |
| 4 | Desenvolvedor Web 2 | Jasmine | 38h | 3545, 3557, 3559, 3564, 3566, 3567, 3572, 3584 |
| 5 | Desenvolvedor Mobile | Arthur | 25h | 3542, 3546, T-43d, 3641, 3550, 3563, 3570 |
| 6 | QA | Adrielly | 28h | 3236, 3570, 3574, 3575, 3576, 3577, 3585, 3586 |
| | **Total** | | **203h** | |

## 5. Horas planejadas por dia

Linha ideal do burndown: total de 203h menos as horas acumuladas planejadas até o fim de cada dia.

| Dia | Data | Evento | Mirelle | Maria Eduarda | Nidlan | Jasmine | Arthur | Adrielly | Total do dia | Restante ideal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 27/10 | Planning / início da sprint | 5 | 4 | 5 | 5 | 4 | 3 | 26 | 177 |
| 2 | 28/10 |  | 5 | 5 | 5 | 5 | 4 | 3 | 27 | 150 |
| 3 | 29/10 | Prazo da professora (3534) | 5 | 4 | 5 | 5 | 5 | 4 | 28 | 122 |
| 4 | 30/10 | Prazo do OpenAPI (3543) | 5 | 5 | 5 | 4 | 4 | 5 | 28 | 94 |
| 5 | 03/11 | Checkpoint intermediário | 5 | 5 | 5 | 5 | 4 | 4 | 28 | 66 |
| 6 | 04/11 |  | 4 | 5 | 5 | 5 | 4 | 3 | 26 | 40 |
| 7 | 05/11 |  | 4 | 5 | 5 | 5 | 0 | 2 | 21 | 19 |
| 8 | 06/11 | Feature freeze + bug bash | 2 | 4 | 3 | 3 | 0 | 2 | 14 | 5 |
| 9 | 09/11 | Review, retrospectiva e entrega da Release 1 | 0 | 0 | 2 | 1 | 0 | 2 | 5 | 0 |
| | | **Total** | **35** | **37** | **40** | **38** | **25** | **28** | **203** | |

### Dependências críticas

```mermaid
flowchart LR
    T3538[3538 MER/DER] --> T3542[3542 Migração e seed]
    T3538 --> T3550[3550 Backend critérios]
    T3538 --> T3558[3558 Backend candidatos]
    T3543[3543 OpenAPI] --> T3580[3580 Swagger UI]
    T3550 --> T3560[3560 Backend elegibilidade]
    T3558 --> T3560
    T3550 --> T3561[3561 Web elegibilidade]
    T3560 --> T3561
    T3552[3552 Backend visitas] --> T3553[3553 Web visitas]
    T3552 --> T3570[3570 Testes de integração]
    T3554[3554 Backend estados] --> T3565[3565 Backend inclusão]
    T3560 --> T3565
    T3563[3563 Backend consentimento] --> T3565
    T3563 --> T3564[3564 Web consentimento]
    T3565 --> T3574[3574 E2E web]
    T3580 --> T3581[3581 README]
    T3576[3576 Cobertura] --> T3581
    T3581 --> T3586[3586 Tag e Release]
```

**Atenção:** o caminho crítico passa por 3538 → 3558/3550 → 3560 → 3565 → 3574, sem folga: a 3565 (inclusão) termina em 05/11, um dia antes do feature freeze.

### Riscos e plano B

| Risco | Plano B |
| --- | --- |
| 3560 (elegibilidade) passa de 03/11 | Arthur assume a parte de backend dos testes do recrutamento e Maria Eduarda fica só na 3565 |
| Nidlan e Jasmine com cerca de 5h por dia quase o tempo todo | Se no checkpoint o restante estiver acima de ~70h, cortar a 3553 (web de visitas); o RF06 continua entregue pela API e fica parcial no README |
| Migrações Flyway criadas por 3542, 3550, 3552 e 3558 | Combinar a numeração e a ordem de merge (V5 de critérios antes da V6 de visitas) para evitar conflito |
| Resposta da professora (3534) atrasada | Seguir a proposta provisória e avisar Maria Eduarda e Arthur |
| Acesso aos critérios inconsistente entre o PBI 3521 e a task 3550 (coordenador consulta?) | Decidir e ajustar o texto do PBI e das tasks 3550 e 3551 |

## 6. Registro da sprint (preencher ao longo e no fim)

### Review

#### O que foi feito
- RF05 a RF11 entregues no backend (critérios, visitas previstas e atividades, estados do estudo, candidatos, avaliação de elegibilidade, consentimento e inclusão com limite de vagas) e na web, com o contrato OpenAPI e o MER atualizados.
- Pendências da Sprint 1 fechadas: telas de estudos integradas à API e permissões por perfil (RF04).
- Seed V10 com dados fictícios (estudos em todos os estados e candidatos em todos os status) e migrações Flyway V1 a V10.
- Testes: testes de componente no frontend (203 testes na execução de 09/11), testes unitários e de integração no backend, teste E2E do fluxo de recrutamento com evidências, relatório de testes e CI a cada PR.
- Documentação: README principal, README da release, diagrama de atividade do recrutamento, capturas de candidatos, consentimento e inclusão, e credenciais fictícias por perfil.

#### O que falta
- Link do protótipo navegável de critérios e visitas (3549).
- Persistir data e hora das visitas: hoje a tela mostra só uma prévia de calendário, e o sistema guarda dia previsto e janela de dias (fora do RF06). Entra na Sprint 3 com o agendamento de visitas (RF12).
- Bugs de severidade baixa encontrados nos testes da release, sem bloquear a entrega: filtro de candidatos sem a opção "Retirado" e texto de vagas sem singular ("1 vagas"). Ficam para a Release 2 ([relatório de testes](../../../releases/release1/relatorio-testes.md)).

#### Resolvido no fechamento
- Swagger UI (3580): springdoc-openapi configurado e mesclado no PR #40. Endereço `http://localhost:8080/api/swagger-ui.html`, liberado no `SecurityConfig` e registrado no README.
- Os 2 testes de `VisitasPrevistasPage` que falhavam foram corrigidos (commit `5a62af5`). A execução de 09/11 terminou com 203 de 203 testes do frontend passando.
- Roteiro de regressão e bug bash (3577): roteiro no PR #35 e execução no PR #46. Regressão de RF01 a RF04: 34 de 34 OK. Bug bash de RF05 a RF11: 23 de 24 OK.
- Tag e GitHub Release (3586): `develop` mesclada na `master` pelo PR #50, tag `v1.0.0` e GitHub Release "Release 1" publicados em 09/11, às 22h56.
- Burndown da Sprint 2 exportado do Azure DevOps (`releases/burndown_sprint2.jpeg`).

#### O que melhorar
- Exigir pull request e revisão também na `develop`, e `AB#` em todo commit: três commits de telas entraram direto na `develop`, sem PR e sem `AB#`.
- Rodar os testes de integração com banco no CI e padronizar o ambiente local (Docker) para todos antes da próxima sprint.
- Atualizar o Remaining Work diariamente, para o burndown refletir a situação real.

#### Impedimentos encontrados
- Falta de Docker e PostgreSQL locais para um integrante, o que fez os testes de integração dependerem do CI.

#### Ações de melhoria para a Release 2
- [ ] Proteger `develop` e `master` exigindo PR e CI verde.
- [ ] Commits e PRs sempre com `AB#`.
- [ ] Docker funcionando em todas as máquinas até o início da Sprint 3.
- [ ] Burndown e Remaining Work atualizados diariamente.

### Burndown

![\[\[../../../releases/burndown_sprint2.jpeg\]\]](../../../releases/burndown_sprint2.jpeg)

**Análise (planejado x realizado):**

- **28/10 a 02/11, acima da linha ideal:** o restante parou em cerca de 158h entre 28/10 e 29/10, enquanto backend e protótipos dependiam do MER (3538) e do OpenAPI (3543). Em 02/11 (feriado) ainda havia cerca de 138h, contra cerca de 88h no ideal.
- **03/11, checkpoint:** a maior queda da sprint, de cerca de 138h para cerca de 76h. Foi quando as tasks de backend e web do recrutamento foram fechadas ou tiveram o Remaining Work atualizado.
- **04/11 a 09/11, abaixo da linha ideal:** o real passou para baixo do ideal entre 04/11 e 05/11 (cerca de 19h em 05/11) e chegou a **0h em 09/11**, como planejado.
- **Leitura:** o escopo foi entregue no prazo. A forma de escada (dias parados e depois quedas grandes) mostra que o Remaining Work não foi atualizado todo dia, o que confirma a ação de melhoria "Burndown e Remaining Work atualizados diariamente". O gráfico começa em cerca de 177h, e não nas 203h planejadas, porque já desconta as 26h do primeiro dia.

### Contribuição por integrante

| # | Papel | Responsável | Contribuição na sprint |
| --- | --- | --- | --- |
| 1 | Gerente | Mirelle | Coordenação da sprint e do board no Azure DevOps (planejamento, rota de horas e acompanhamento dos PRs). Backend de visitas previstas e atividades (3552), com as correções do review (listagem sem erro de carregamento lazy, edição sem violar o índice único, acesso restrito ao pesquisador, bloqueio em estudo encerrado e testes de integração), backend de estados do estudo (3554) e testes unitários de visitas e transições (3556). Contrato OpenAPI de RF05 a RF11 (3543), diagrama de atividade do recrutamento (3536), README principal (3581) e Swagger UI com os endpoints de RF01 a RF11 documentados (3580, PR #40). |
| 2 | Backend | Maria Eduarda | Backend de candidatos (3558), de avaliação de elegibilidade (3560) e de inclusão com limite de vagas (3565), com o MER/DER atualizado para RF05 a RF11 (3538). Testes unitários, de controller e de integração do recrutamento (3568), entregues nos mesmos commits do backend (`CandidatoServiceTest`, `AvaliacaoServiceTest`, `RegraElegibilidadeTest`, `InclusaoServiceTest`, `ConsentimentoServiceTest` e `RecrutamentoIntegrationTest`), e backend do consentimento simulado com bloqueio em estudo encerrado (commits `e07c386` e `567488d`, PR #42). Os testes de critérios, visitas e estados (3556) previstos para ela foram feitos pela Adrielly. |
| 3 | Web 1 | Nidlan Hendell | Telas web de permissões de estudos por perfil (3692), critérios (3551), visitas previstas e atividades (3553), controle do estado do estudo (3555) e avaliação de elegibilidade (3561), além de testes de componente das telas de critérios, visitas e avaliação (3571). Os testes de componente foram entregues em 09/11, sem `AB#`. Ficaram pendentes as capturas das telas (3583) e o link do protótipo de critérios e visitas (3549). |
| 4 | Web 2 | Jasmine | Integração das telas de estudos à API (3545), protótipo navegável do recrutamento (3557), telas de candidatos (3559), registro de consentimento (3564) e inclusão com limite de vagas e mensagens de erro (3566). Testes unitários, de integração e de componente do recrutamento (3567 e 3572) e capturas de tela de candidatos, consentimento e inclusão, com sucesso e erro (3584). |
| 5 | Mobile | Arthur | CI com testes e cobertura rodando a cada PR (3546) e sincronização da develop (3641); backend de critérios de inclusão e exclusão com regras por estado do estudo (3550); testes de integração dos endpoints de RF05 a RF11 (3570); seed de dados fictícios com estudos em todos os estados e candidatos em todos os status (3542). O consentimento (3563) entrou na develop via PR #42 junto com o recrutamento. O app mobile foi congelado, conforme T-43d. |
| 6 | QA | Adrielly | Testes do cadastro de estudos (3236), teste E2E do fluxo de recrutamento com evidências (3574), relatório de testes e cobertura (3576), CI com testes e cobertura a cada PR (3575), credenciais fictícias por perfil (3585) e revisão de código dos PRs. Também fez os testes de integração de critérios, visitas e erros do recrutamento com o banco real (3570, PR #36), os testes unitários de transições de estado e de regras de critérios e visitas (3556, PR #34), o roteiro de regressão de RF01 a RF04 e o bug bash de RF05 a RF11 com evidências (3577, PRs #35 e #46), a revisão cruzada do MER/DER (3539, PR #22) e a tag `v1.0.0` com o GitHub Release "Release 1" (3586). |

### Requisitos da sprint — situação final

| RF | Concluído | Parcial | Não implementado | Justificativa |
| --- | --- | --- | --- | --- |
| RF04 (pendência) | ☒ | ☐ | ☐ | Telas de estudos integradas à API (3545) e permissões por perfil (3692): criar e editar só para o pesquisador. |
| RF05 | ☒ | ☐ | ☐ | CriterioController, contrato OpenAPI, tela de critérios e testes de componente. |
| RF06 | ☒ | ☐ | ☐ | VisitaPrevistaController, contrato OpenAPI, tela de visitas e testes (unitários, de integração e de componente). A prévia de calendário não persiste data e hora e não faz parte do RF06. |
| RF07 | ☒ | ☐ | ☐ | Endpoint de mudança de estado no EstudoController e no contrato OpenAPI, e tela de controle de estado. As transições foram definidas pelo grupo, porque o enunciado só lista os estados. |
| RF08 | ☒ | ☐ | ☐ | CandidatoService e telas de listagem e cadastro integradas à API, com capturas de sucesso e erro. |
| RF09 | ☒ | ☐ | ☐ | AvaliacaoController com RegraElegibilidade, tela de avaliação de elegibilidade e testes de componente. |
| RF10 | ☒ | ☐ | ☐ | ConsentimentoService (PR #42), tela de registro de consentimento e capturas de tela. |
| RF11 | ☒ | ☐ | ☐ | InclusaoService com as travas de elegibilidade, consentimento, vaga e estudo em recrutamento, tela de inclusão e capturas dos bloqueios (vagas esgotadas e inelegível). |
