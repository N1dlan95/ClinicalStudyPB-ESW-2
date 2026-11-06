# ClinicalStudyPB

Sistema simplificado de gestão do ciclo de vida de estudos clínicos, desenvolvido na disciplina de Engenharia de Software II (UEPB, 2026.2).

> **Aviso:** projeto acadêmico. Todos os dados são fictícios e o sistema não toma nenhuma decisão clínica automatizada.

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Release 1: escopo](#release-1-escopo)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Como executar](#como-executar)
- [Testes e cobertura](#testes-e-cobertura)
- [API e documentação interativa](#api-e-documentação-interativa)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Equipe e papéis](#equipe-e-papéis)

## Sobre o projeto

O ClinicalStudyPB reproduz, de forma simplificada, o ciclo de vida de um estudo clínico: o pesquisador cadastra o estudo e define os critérios de inclusão e exclusão e as visitas previstas; o coordenador cadastra os candidatos, avalia a elegibilidade, registra o consentimento e inclui participantes respeitando o limite de vagas.

O desenvolvimento segue Scrum, com o board, as sprints e o burndown no Azure DevOps. A cada sprint os papéis da equipe rotacionam; testes, documentação e revisão de código são responsabilidade de todos.

## Release 1: escopo

A Release 1 (**Estrutura e recrutamento**) reúne as Sprints 1 e 2 e entrega uma aplicação web que permite cadastrar um estudo, avaliar candidatos e incluir participantes.

| ID | Requisito | Sprint |
| --- | --- | --- |
| RF01 | Cadastrar e gerenciar usuários (pesquisador, coordenador, administrador, participante) | 1 |
| RF02 | Autenticação e encerramento de sessão | 1 |
| RF03 | Restringir funcionalidades conforme o perfil | 1 |
| RF04 | Cadastrar estudos (título, objetivo, responsável, datas, limite de participantes) | 1 (fechado na 2) |
| RF05 | Critérios de inclusão e exclusão | 2 |
| RF06 | Visitas previstas e atividades | 2 |
| RF07 | Estados do estudo | 2 |
| RF08 | Cadastro de candidatos | 2 |
| RF09 | Avaliação de elegibilidade | 2 |
| RF10 | Consentimento simulado | 2 |
| RF11 | Inclusão com limite de vagas | 2 |

**App mobile:** o desenvolvimento foi congelado nesta release. Os requisitos RF17 a RF20 (estudos, visitas e retirada) ficam para a Release 2. A situação detalhada está no
[README da Release 1](releases/README-release1.md).

A situação final de cada requisito, as evidências e as capturas de tela estão no [README da release](releases/README-release1.md).

## Arquitetura

```mermaid
flowchart LR
    U[Usuário no navegador] --> F[Frontend web<br/>porta 3000]
    F -->|HTTP + JWT| A[API REST Spring Boot<br/>porta 8080, base /api]
    A -->|JPA| D[(PostgreSQL<br/>porta 5432)]
    A -. migrações .-> M[Flyway]
    M --> D
    O[Contrato OpenAPI] -. documenta .-> A
```

- **Frontend web:** telas por perfil (menus e rotas restritos conforme o perfil do usuário).
- **Backend:** API REST organizada em pacotes por funcionalidade (por exemplo `estudo`, `candidato` e `visitaprevista`, além do pacote `config` com a segurança). A autenticação usa token JWT e o acesso às rotas é controlado por perfil.
- **Banco de dados:** PostgreSQL, com o esquema criado e versionado pelo Flyway na inicialização da API.
- **Contrato da API:** descrito em OpenAPI (`openapi.yaml`). O Swagger UI, gerado pelo springdoc-openapi, será adicionado ao backend na task 3580.

O modelo de dados está em [`Docs/ClinicalStudyPB-Docs/Diagramas/MER-v2.md`](Docs/ClinicalStudyPB-Docs/Diagramas/MER-v2.md).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Java 21, Spring Boot, Maven (wrapper `mvnw`), Spring Security com JWT, JPA/Hibernate, Flyway |
| Banco de dados | PostgreSQL |
| Frontend web | [CONFIRMAR framework], testes com Vitest |
| Mobile | [CONFIRMAR tecnologia] (congelado nesta release) |
| Documentação da API | Contrato OpenAPI (`openapi.yaml`); Swagger UI com springdoc-openapi previsto na task 3580 |
| Testes e cobertura | JUnit e JaCoCo (backend), Vitest (frontend) |
| Infraestrutura | Docker e Docker Compose |
| Integração contínua | GitHub Actions (testes e cobertura a cada pull request) |
| Gestão | Azure DevOps (board, sprints e burndown) |

## Como executar

### Pré-requisito

- Docker Desktop instalado e em execução (no Windows, com o WSL 2 habilitado).

### Subir o projeto

Na raiz do repositório:

```bash
docker compose up --build
```

Depois, acesse:

| Serviço | Endereço |
| --- | --- |
| Frontend | <http://localhost:3000> |
| API | <http://localhost:8080/api> |
| PostgreSQL | `localhost:5432` |

As migrações do Flyway rodam automaticamente na primeira inicialização. Para executar em segundo plano use `docker compose up --build -d`, e para parar use `docker compose down`.

Os detalhes (logs, volumes, remoção dos dados e configuração de produção com `JWT_SECRET`) estão em [`DOCKER.md`](DOCKER.md).

### Credenciais fictícias

A migração V2 cria um usuário de teste para cada perfil. Os dados são fictícios e valem apenas para o ambiente de desenvolvimento e avaliação.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| ADMINISTRADOR | `admin@clinicalstudypb.test` | `Senha@123` |
| PESQUISADOR | `pesquisador@clinicalstudypb.test` | `Senha@123` |
| COORDENADOR | `coordenador@clinicalstudypb.test` | `Senha@123` |
| PARTICIPANTE | `participante@clinicalstudypb.test` | `Senha@123` |

Nunca reutilize essas credenciais fora do ambiente de desenvolvimento.

## Testes e cobertura

Backend (na pasta `backend/clinicalstudypb-api`, com o banco no ar pelo Docker):

```bash
./mvnw clean test      # roda os testes
./mvnw verify          # roda os testes e gera o relatório de cobertura
```

O relatório do JaCoCo fica em `backend/clinicalstudypb-api/target/site/jacoco/index.html`. A meta da release é **cobertura de pelo menos 80% das linhas de negócio do backend**, com evidência no relatório de testes da release.

Frontend (na pasta `frontend`): 

```bash
npm test                 # roda os testes
npm run test:coverage    # roda os testes e gera a cobertura
```

O GitHub Actions executa os testes e a cobertura a cada pull request, e um PR só é mesclado com a verificação verde e ao menos uma revisão.

## API e documentação interativa

- **Base da API:** `http://localhost:8080/api`
- **Swagger UI:** ainda não disponível (task 3580). Quando o springdoc-openapi entrar no backend, o endereço esperado é `http://localhost:8080/api/swagger-ui.html` [CONFIRMAR].
- **Contrato OpenAPI:** [`Docs/ClinicalStudyPB-Docs/api/openapi.yaml`](Docs/ClinicalStudyPB-Docs/api/openapi.yaml)
- **Autenticação:** faça login para obter o token e envie-o no cabeçalho `Authorization: Bearer <token>`. As rotas são restritas por perfil.

## Estrutura do repositório

```text
.
├── backend/                 # API Spring Boot (clinicalstudypb-api)
├── frontend/                # aplicação web (código e testes em frontend/frontend)
├── mobile/                  # app do participante (congelado na Release 1)
├── Docs/ClinicalStudyPB-Docs/
│   ├── Contexto-Geral/      # contexto e requisitos
│   ├── Diagramas/           # MER/DER (MER-v1, MER-v2)
│   ├── Sprints/             # planejamento e registro de cada sprint
│   └── api/                 # contrato OpenAPI
├── releases/               # documentação de cada release
├── .github/                 # workflows de CI
├── docker-compose.yml
├── DOCKER.md
└── .env.example
```

## Fluxo de trabalho

- **Branches:** `master` guarda as releases e `develop` integra o trabalho. Cada task usa uma branch própria a partir da `develop`, com prefixo por tipo e o ID do Azure DevOps, por exemplo `feat/3552-backend-visitas-atividades` ou `docs/3581-readme-principal`.
- **Commits:** mensagens no padrão `tipo(escopo): descrição (#ID)`, como `feat(visitas): expõe endpoints REST (#3552)`. O `#ID` liga o commit à task no Azure Boards.
- **Pull requests:** sempre para a `develop`, com descrição, passos para testar e checklist do autor e do revisor. Exigem revisão cruzada de ao menos uma pessoa e o CI verde.
- **Release:** a `develop` é mesclada na `master`, recebe a tag da release e um GitHub Release com o resumo e o link para a documentação.

## Equipe e papéis

Os papéis rotacionam a cada sprint.

| Papel | Sprint 1 | Sprint 2 |
| --- | --- | --- |
| Líder técnico / Gerente | Nidlan Hendell | Mirelle |
| Backend | Maria Eduarda | Maria Eduarda |
| Web 1 (estudos, protocolos, usuários) | Mirelle | Nidlan Hendell |
| Web 2 (recrutamento, visitas, relatórios) | Adrielly | Jasmine |
| Mobile | Jasmine | Arthur |
| QA / DevOps | Arthur | Adrielly |

A documentação completa de cada sprint está em [`Docs/ClinicalStudyPB-Docs/Sprints`](Docs/ClinicalStudyPB-Docs/Sprints).
