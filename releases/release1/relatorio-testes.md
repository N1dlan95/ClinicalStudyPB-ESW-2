# Relatório de testes e cobertura: Release 1

Task 3576. Evidência dos testes automatizados, da cobertura do backend (meta: 80% das linhas de negócio) e dos testes manuais da Release 1, depois que os PRs da Sprint 2 entraram na `develop`.

- **Commit da develop medido:** `1e0ff9f` (mesmo código de `4d69f04`; desde então só entrou documentação)
- **Data da execução:** 09/11/2026
- **Execução no CI:** [GitHub Actions, CI da develop em `1e0ff9f`](https://github.com/N1dlan95/ClinicalStudyPB-ESW-2/actions/runs/42729880697) (verde)

## Resumo

| Item | Resultado |
| --- | --- |
| Testes automatizados | **531 de 531 passaram** (328 no backend e 203 no frontend) |
| Cobertura de linhas do backend | **97,9%** (meta de 80%: atingida) |
| Cobertura de linhas do frontend | **89,3%** |
| Regressão manual RF01 a RF04 | **34 de 34 OK** |
| Bug bash RF05 a RF11 | **23 de 24 OK**, 1 bug de severidade baixa |
| E2E do fluxo de recrutamento | **1 fluxo, passou** (task 3574) |

## Como reproduzir

Backend (com o banco no ar: `docker compose up -d database`), na pasta `backend/clinicalstudypb-api`:

```bash
./mvnw clean verify
```

O relatório do JaCoCo fica em `backend/clinicalstudypb-api/target/site/jacoco/index.html`.

> Os testes de integração apagam e recriam dados no banco. Para não perder os dados de demonstração do Docker, dá para rodar contra um Postgres separado e apontar `SPRING_DATASOURCE_URL` para ele, como foi feito nesta execução.

Frontend, na pasta `frontend/frontend`:

```bash
npm ci
npm run test:coverage
```

O relatório do Vitest fica em `frontend/frontend/coverage/index.html`.

E2E, com o ambiente no ar (`docker compose up -d --build`), na pasta `e2e` (veja o [README do E2E](../../e2e/README.md)):

```bash
npm install
npx playwright install chromium
npm test
```

## 1. Resultado dos testes automatizados

| Camada | Ferramenta | Testes | Passaram | Falharam | Ignorados |
| --- | --- | --- | --- | --- | --- |
| Backend: unitários e de controller | JUnit 5 + Mockito + MockMvc | 276 | 276 | 0 | 0 |
| Backend: integração (banco real) | JUnit 5 + Spring Boot Test + PostgreSQL | 52 | 52 | 0 | 0 |
| Frontend web: unidade e componente | Vitest + Testing Library (26 arquivos) | 203 | 203 | 0 | 0 |
| E2E web | Playwright | 1 fluxo | 1 | 0 | 0 |
| **Total** | | **532** | **532** | **0** | **0** |

### Testes por módulo do backend

| Módulo (pacote) | RF | Classes de teste | Testes |
| --- | --- | --- | --- |
| `usuario` | RF01 | `UsuarioServiceTest`, `UsuarioControllerTest` | 19 |
| `auth` | RF02 | `TokenServiceTest`, `AuthControllerTest` | 16 |
| `config` | RF03 | `AutorizacaoTest`, `OpenApiIntegrationTest` | 38 |
| `estudo` | RF04, RF07 | `EstudoServiceTest`, `EstudoControllerTest`, `EstudoIntegrationTest`, `EstadoEstudoIntegrationTest` | 56 |
| `criterio` | RF05 | `CriterioServiceTest`, `CriterioControllerTest`, `CriterioIntegrationTest` | 46 |
| `visitaprevista` | RF06 | `VisitaPrevistaServiceTest`, `VisitaPrevistaControllerTest`, `VisitaPrevistaIntegrationTest`, `VisitaPrevistaRegrasIntegrationTest` | 40 |
| `candidato` | RF08, RF10, RF11 | `CandidatoServiceTest`, `CandidatoControllerTest`, `ConsentimentoServiceTest`, `ConsentimentoControllerTest`, `InclusaoServiceTest`, `InclusaoControllerTest`, `RecrutamentoIntegrationTest`, `RecrutamentoErrosIntegrationTest` | 76 |
| `avaliacao` | RF09 | `AvaliacaoServiceTest`, `AvaliacaoControllerTest`, `RegraElegibilidadeTest` | 35 |
| outros | | `ClinicalstudypbApiApplicationTests`, `ExemploTest` | 2 |
| **Total** | | | **328** |

## 2. Cobertura do backend (JaCoCo)

**Cobertura das linhas de negócio:** 97,9% (798 de 815 linhas). **Meta da release:** 80%. **Atingida.**

| Pacote | Linhas cobertas | Cobertura de linhas | Cobertura de ramos |
| --- | --- | --- | --- |
| `clinicalstudypb.usuario` | 84 de 94 | 89,4% | 43,8% |
| `clinicalstudypb.auth` | 73 de 73 | 100% | 100% |
| `clinicalstudypb.estudo` | 98 de 101 | 97,0% | 88,5% |
| `clinicalstudypb.criterio` | 88 de 88 | 100% | 100% |
| `clinicalstudypb.visitaprevista` | 114 de 114 | 100% | 89,5% |
| `clinicalstudypb.candidato` | 136 de 138 | 98,6% | 100% |
| `clinicalstudypb.avaliacao` | 96 de 98 | 98,0% | 100% |
| `clinicalstudypb.config` e `config.erro` | 109 de 109 | 100% | sem ramos |
| **Linhas de negócio (pacotes acima, sem DTOs)** | **798 de 815** | **97,9%** | |

Com os DTOs e a classe `main`, o total do JaCoCo fica em 97,9% das linhas (877 de 896) e 91% dos ramos.

![Relatório do JaCoCo](img/relatorio-jacoco.png)

## 3. Cobertura do frontend web (Vitest)

**Cobertura geral de linhas:** 89,3% (1052 de 1178). Comandos: 87,5%. Ramos: 83,0%. Funções: 81,8%.

| Área | Cobertura de linhas |
| --- | --- |
| `features/usuarios` | 99,4% |
| `features/candidatos` | 94,4% |
| `features/auth` | 86,9% |
| `features/estudos` | 86,2% |
| `layout`, `services` e `routes` | 32,3% |

![Relatório de cobertura do Vitest](img/relatorio-vitest.png)

## 4. Testes manuais

O resultado completo, com os prints de cada caso, está em [`execucao-release1-2026-11-09.md`](../../Docs/ClinicalStudyPB-Docs/Testes/execucao-release1-2026-11-09.md).

- **Regressão RF01 a RF04:** 34 de 34 casos OK (login, perfis, usuários e estudos).
- **Bug bash RF05 a RF11:** 23 de 24 OK, pela API e pelas telas de candidatos.

### Bugs encontrados

| # | Título | Severidade | Bloqueia a entrega? |
| --- | --- | --- | --- |
| 1 | [Candidatos] Filtro de status não tem a opção "Retirado" | Baixa | Não |
| 2 | [Candidatos e Estado] Texto de vagas sem singular ("1 de 1 vagas", "1 vagas") | Baixa | Não |

O bug 2 foi encontrado durante o E2E (prints `09` e `10` em [`e2e/evidencias/`](../../e2e/evidencias/)).

## 5. E2E

Fluxo, todo pela tela: cadastrar estudo com 1 vaga > critérios de inclusão e exclusão > iniciar recrutamento (pesquisador) > cadastrar dois candidatos > avaliar > consentir > incluir (coordenador), com os erros de inclusão sem consentimento e de vagas esgotadas (este também conferido na API: `409 VAGAS_ESGOTADAS`).

- **Resultado:** passou, nas duas execuções contra o Docker Compose (develop `1e0ff9f`), em cerca de 10 s cada.
- **Evidência:** um print de cada uma das 10 etapas em [`e2e/evidencias/`](../../e2e/evidencias/), e o vídeo no relatório HTML do Playwright (`npm run relatorio` na pasta `e2e`).
- **Limitação:** o E2E roda localmente, ainda não no CI.

## 6. O que ficou de fora e por quê

| Item | Motivo | Plano |
| --- | --- | --- |
| E2E no CI | Exige subir o Docker Compose no GitHub Actions | Release 2 |
| Bugs 1 e 2 (severidade baixa) | Não bloqueiam a entrega | Corrigir na Release 2 |
| Ramos do pacote `usuario` (43,8%) | Faltam testes para as combinações de filtros da listagem (`UsuarioFiltros`) | Release 2 |
| `layout`, `services` e `routes` do frontend (32,3%) | Menu lateral e cliente HTTP sem teste de componente próprio; são cobertos pela regressão manual | Release 2 |
| App mobile (RF17 a RF20) | Congelado nesta release | Release 2 |

## 7. Conclusão

- [x] A cobertura das linhas de negócio do backend atingiu 80% (97,9%).
- [x] Todos os testes automatizados passaram: 531 de 531 (unitários, de integração e de componente), localmente e no CI.
- [x] O E2E do fluxo de recrutamento passou.
- [x] A regressão, o bug bash e o E2E não encontraram bug que bloqueie a entrega.

**A Release 1 está liberada pelos testes.**

### Observação sobre o CI

O `pom.xml` tem uma regra do JaCoCo (`rf06-coverage`) que faz o build falhar abaixo de 80%, mas ela vale só para o pacote `visitaprevista` (RF06). A meta da release (80% das linhas de negócio do backend inteiro) é conferida neste relatório, não pelo CI.
