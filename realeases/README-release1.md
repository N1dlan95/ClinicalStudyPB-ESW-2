# Release 1: Estrutura e recrutamento

Documentação da primeira release do ClinicalStudyPB, que reúne as Sprints 1 e 2 e entrega uma aplicação web para cadastrar estudos clínicos, avaliar candidatos e incluir participantes. Todos os dados são fictícios.

- **Período:** 13/10/2026 a 10/11/2026 (Sprint 1: 13/10 a 26/10; Sprint 2: 27/10 a 06/11; fechamento e entrega: 09/11 e 10/11)
- **Tag:** `release1`
- **GitHub Release:** [CONFIRMAR: link, criado na task 3586]
- **README principal:** [`README.md`](../../README.md)
- **Como executar:** [`DOCKER.md`](../../DOCKER.md)

## 1. Requisitos da release: situação final

Marque a situação de cada requisito ao fim da Sprint 2 e justifique os parciais.

| RF | Requisito | Sprint | Concluído | Parcial | Não implementado | Justificativa |
| --- | --- | --- | --- | --- | --- | --- |
| RF01 | Cadastrar e gerenciar usuários | 1 | ☐ | ☐ | ☐ | |
| RF02 | Autenticação e encerramento de sessão | 1 | ☐ | ☐ | ☐ | |
| RF03 | Restringir funcionalidades conforme o perfil | 1 | ☐ | ☐ | ☐ | |
| RF04 | Cadastrar estudos | 1 e 2 | ☐ | ☐ | ☐ | |
| RF05 | Critérios de inclusão e exclusão | 2 | ☐ | ☐ | ☐ | |
| RF06 | Visitas previstas e atividades | 2 | ☐ | ☐ | ☐ | |
| RF07 | Estados do estudo | 2 | ☐ | ☐ | ☐ | |
| RF08 | Cadastro de candidatos | 2 | ☐ | ☐ | ☐ | |
| RF09 | Avaliação de elegibilidade | 2 | ☐ | ☐ | ☐ | |
| RF10 | Consentimento simulado | 2 | ☐ | ☐ | ☐ | |
| RF11 | Inclusão com limite de vagas | 2 | ☐ | ☐ | ☐ | |

## 2. Fora do escopo desta release

### App mobile congelado

O app do participante não evoluiu nesta release. As telas de estudos, visitas e retirada (**RF17 a RF20**) foram congeladas na Sprint 2 (task T-43d) e ficam para a Release 2. O projeto mobile continua no repositório, na pasta `mobile/`, com a estrutura e o login definidos na Sprint 1.

### Limitações conhecidas

- [preencher com o que ficou parcial ou fora, por exemplo uma tela cortada no checkpoint]

## 3. Sprints

| Sprint | Período | Objetivo | Documento |
| --- | --- | --- | --- |
| 1 | 13/10 a 26/10 | Base do projeto (repositório, ambiente, modelagem, protótipos) e RF01 a RF04 | [`sprint-1.md`](../../Docs/ClinicalStudyPB-Docs/Sprints/sprint-1.md) |
| 2 | 27/10 a 06/11 | RF05 a RF11, pendências da Sprint 1, cobertura ≥ 80% e entrega da release | [`sprint-2.md`](../../Docs/ClinicalStudyPB-Docs/Sprints/sprint-2.md) |

### Papéis por sprint

| Papel | Sprint 1 | Sprint 2 |
| --- | --- | --- |
| Líder técnico / Gerente | Nidlan Hendell | Mirelle |
| Backend | Maria Eduarda | Maria Eduarda |
| Web 1 (estudos, protocolos, usuários) | Mirelle | Nidlan Hendell |
| Web 2 (recrutamento, visitas, relatórios) | Adrielly | Jasmine |
| Mobile | Jasmine | Arthur |
| QA / DevOps | Arthur | Adrielly |

### Burndown

- Sprint 1: ![Burndown da Sprint 1](burndown-sprint1.png)
- Sprint 2: ![Burndown da Sprint 2](burndown-sprint2.png)

## 4. Evidências

| Evidência | Onde encontrar |
| --- | --- |
| Relatório de testes e cobertura ≥ 80% (task 3576) | [CONFIRMAR: link ou caminho do relatório] |
| Capturas de tela da interface web, com sucesso e erro/validação (tasks 3583 e 3584) | [CONFIRMAR: pasta das capturas] |
| Credenciais fictícias por perfil (task 3585) | [CONFIRMAR: link do documento] |
| Swagger UI com RF01 a RF11 (task 3580) | [CONFIRMAR: endereço do Swagger UI] |
| Contrato OpenAPI | [`openapi.yaml`](../../Docs/ClinicalStudyPB-Docs/api/openapi.yaml) |
| Modelo de dados (MER/DER) | [`MER-v2.md`](../../Docs/ClinicalStudyPB-Docs/Diagramas/MER-v2.md) |
| Protótipos navegáveis | [CONFIRMAR: links do Figma ou Penpot] |
| Teste E2E do fluxo completo (cadastrar estudo, cadastrar candidato, avaliar, consentir e incluir) | [CONFIRMAR: link do workflow ou do teste] |

## 5. Decisões técnicas

- **Stack:** [CONFIRMAR: opção escolhida na Sprint 1 e a justificativa registrada na task T-05]
- **Ambiente:** Docker Compose com banco, backend e frontend, para qualquer integrante rodar o projeto do mesmo jeito.
- **Banco:** migrações versionadas com Flyway, executadas na inicialização da API.
- **Qualidade:** integração contínua com testes e cobertura a cada pull request, revisão cruzada obrigatória e cobertura mínima de 80% das linhas de negócio do backend.

## 6. Próximos passos (Release 2)

- Retomar o app mobile (RF17 a RF20)
- [preencher com as ações de melhoria da retrospectiva da Sprint 2]
