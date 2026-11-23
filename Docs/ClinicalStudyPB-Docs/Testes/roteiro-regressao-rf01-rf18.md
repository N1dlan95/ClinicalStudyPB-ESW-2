---
tags:
  - testes
  - regressao
  - qa
  - bug-bash
release: 2
task: T-111
data: 2026-11-18
responsavel: Mirelle Casimiro
---

# Roteiro de regressão e Bug Bash — RF01 a RF18

Este documento é o roteiro da Release 2: a regressão de RF01 a RF11, entregues na Release 1, e os fluxos novos de RF12 a RF18, para o Bug Bash de 19/11/2026, mantendo alinhamento com a documentação oficial do projeto e com os roteiros já existentes em `Docs/ClinicalStudyPB-Docs/Testes`.

## 1. Base de análise e fontes consultadas

Antes de atualizar o roteiro, foram revisados os materiais já existentes no repositório:

- [`roteiro-regressao-rf01-rf04.md`](./roteiro-regressao-rf01-rf04.md)
- [`bug-bash-2026-11-06.md`](./bug-bash-2026-11-06.md)
- [`execucao-release1-2026-11-09.md`](./execucao-release1-2026-11-09.md)
- [`README.md`](../../../README.md)
- [`releases/release1/README.md`](../../../releases/release1/README.md)
- [`mobile/README.md`](../../../mobile/README.md)
- [`Docs/ClinicalStudyPB-Docs/Diagramas/MER-v1.md`](../Diagramas/MER-v1.md)
- [`Docs/ClinicalStudyPB-Docs/Diagramas/MER-v2.md`](../Diagramas/MER-v2.md)
- [`Docs/ClinicalStudyPB-Docs/Diagramas/MER-v3.md`](../Diagramas/MER-v3.md)
- [`Docs/ClinicalStudyPB-Docs/api/openapi.yaml`](../api/openapi.yaml)

Também foram considerados os requisitos oficiais mapeados no README principal do projeto e os fluxos da modelagem do estudo clínico, sem inventar cenários não confirmados na documentação.

## 2. Objetivo

- Garantir a regressão dos requisitos RF01 a RF11 já validados na Release 1.
- Incluir e revisar os fluxos previstos para RF12 a RF18 quando houver confirmação na documentação oficial.
- Organização do quadro de testes por requisito, perfil de usuário e fluxo de utilização.
- Distribuir a execução entre os seis integrantes da equipe.
- Publicar o roteiro até 18/11/2026 e preparar o Bug Bash para 19/11/2026.

## 3. Escopo e critérios de execução

### 3.1. Ambiente

- Ambiente local com `docker compose up -d --build`.
- Web em `http://localhost:3000`.
- API em `http://localhost:8080/api`.
- Contas fictícias da migração V2 com senha `Senha@123`.

| Perfil | E-mail |
| --- | --- |
| ADMINISTRADOR | `admin@clinicalstudypb.test` |
| PESQUISADOR | `pesquisador@clinicalstudypb.test` |
| COORDENADOR | `coordenador@clinicalstudypb.test` |
| PARTICIPANTE | `participante@clinicalstudypb.test` |

### 3.2. Estrutura de cada caso de teste

Para cada caso, o registro deve conter:

1. Identificador único.
2. Requisito funcional relacionado.
3. Funcionalidade ou fluxo testado.
4. Perfil de usuário responsável pela execução.
5. Pré-condições.
6. Dados necessários para execução.
7. Passos detalhados para reprodução.
8. Resultado esperado.
9. Resultado obtido (preenchimento no Bug Bash).
10. Status: Não executado, Aprovado, Reprovado ou Bloqueado.
11. Observações.
12. Evidências.
13. Data do teste (dd/mm/aaaa), sempre preenchida quando o caso for executado.

### 3.3. Regras de evidência

- Registrar prints ou vídeo por caso.
- Quando houver falha, abrir card no Azure DevOps com o mesmo padrão do documento de Bug Bash.
- Não duplicar registros de defeitos.
- Toda execução, inclusive o reteste depois da correção de um bug, entra no **histórico de testes** do [`bug-bash-2026-11-19.md`](./bug-bash-2026-11-19.md) com a data, quem testou e se teve problema ou não. Na tabela do roteiro fica só a execução mais recente.
- Em caso de resultado pendente por ausência de implementação ou documentação, registrar como `PENDÊNCIA DE ESCLARECIMENTO` e não inventar cenário.

## 4. Roteiro de regressão: RF01 a RF11

### RF01 — Usuários

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | RF01 | Listagem de usuários e filtros | ADMINISTRADOR | Usuário autenticado | Usuários de demonstração | Lista, filtros por perfil e status funcionando | Lista com 7 usuários; o filtro por perfil traz só PESQUISADOR e o filtro por status traz só inativos. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-02 | RF01 | Cadastro de usuário com dados válidos | ADMINISTRADOR | Usuário autenticado | E-mail ainda não cadastrado | Usuário criado e listado | Usuário criado (201) e encontrado na busca pelo e-mail. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-03 | RF01 | Cadastro com e-mail duplicado | ADMINISTRADOR | Usuário autenticado | E-mail já existente | Mensagem de erro específica e link ao usuário existente | 409 `EMAIL_DUPLICADO`: "Já existe um usuário com este e-mail", também com o e-mail em maiúsculas. | Aprovado | O link para o usuário existente na tela não foi conferido nesta execução. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-04 | RF01 | Edição de usuário e desativação | ADMINISTRADOR | Usuário autenticado | Usuário em ativo | Status atualizado para inativo | Nome editado (200) e usuário desativado (200, `ativo: false`). | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-05 | RF01 | Bloqueio do próprio usuário | ADMINISTRADOR | Usuário autenticado | Usuário logado em edição própria | Mensagem de bloqueio e ação rejeitada | Na tela, o status fica desabilitado com "Você não pode desativar o próprio usuário.". Pela API, `PATCH /usuarios/{id}/status` do próprio administrador responde 200 e desativa a conta; o login dele passa a responder 401. | Reprovado | **Bug #1** do bug bash da Release 2. A regra existe só na tela. | [R-05](evidencias/bug-bash-release2/R-05.png) e [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-06 | RF01 | Validação do formulário vazio | ADMINISTRADOR | Usuário autenticado | Formulário vazio | Erros por campo e bloqueio do cadastro | 400 `VALIDACAO` com erro em `nome`, `email`, `perfil` e `senha`. | Aprovado | Erros por campo na tela cobertos pelos testes de componente (`UsuarioFormPage.test.tsx`). | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |

### RF02 — Autenticação e encerramento de sessão

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-07 | RF02 | Login com credenciais válidas | ADMINISTRADOR / PESQUISADOR / COORDENADOR | Usuários existentes | E-mail e senha corretos | Redirecionamento para tela correta | Administrador, pesquisador e coordenador entram e vão para `/estudos`. | Aprovado |  | [R-07](evidencias/bug-bash-release2/R-07.png) | 23/11/2026 |
| R-08 | RF02 | Login de participante no painel web | PARTICIPANTE | Conta participante ativa | Credenciais do participante | Acesso bloqueado com mensagem específica | Login recusado na tela com "O painel web é exclusivo para a equipe do estudo. Use o aplicativo.". | Aprovado |  | [R-08](evidencias/bug-bash-release2/R-08.png) | 23/11/2026 |
| R-09 | RF02 | Login com senha incorreta | QUALQUER | Sistema disponível | E-mail correto, senha errada | Mensagem de credenciais inválidas | 401 `CREDENCIAIS_INVALIDAS`: "E-mail ou senha incorretos". | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-10 | RF02 | Campos vazios e e-mail inválido | QUALQUER | Tela de login aberta | Dados incompletos | Mensagens de validação sem chamar a API | "Informe um e-mail válido." e "Informe a senha." aparecem e nenhuma chamada a `/auth/login` é feita. | Aprovado |  | [R-10](evidencias/bug-bash-release2/R-10.png) | 23/11/2026 |
| R-11 | RF02 | Usuário inativo bloqueado | QUALQUER | Usuário com status inativo | Credenciais válidas | Acesso negado e mensagem de conta desativada | 401 `USUARIO_INATIVO`: "Usuário desativado. Procure o administrador". | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-12 | RF02 | Sessão persistente e logout | QUALQUER | Usuário autenticado | Sessão ativa | Recarregamento mantém login; logout retorna ao login | Depois de recarregar a página, a sessão continua em `/estudos`; "Sair" volta para `/login`. | Aprovado |  | [R-12](evidencias/bug-bash-release2/R-12.png) | 23/11/2026 |

### RF03 — Restrições por perfil

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-13 | RF03 | Menu e acessos por perfil | ADMINISTRADOR / PESQUISADOR / COORDENADOR | Usuários autenticados | Perfis diferentes | Menus e rotas compatíveis com permissão | O administrador vê "Usuários" no menu; pesquisador e coordenador não veem. | Aprovado |  | [R-13](evidencias/bug-bash-release2/R-13.png) | 23/11/2026 |
| R-14 | RF03 | Bloqueio de rota `/usuarios` | PESQUISADOR / COORDENADOR | Usuário logado | URL manual | Tela "Acesso negado" na própria rota, sem redirecionar | Pesquisador em `/usuarios` vê "Acesso negado" sem sair da rota; a API responde 403 para pesquisador e coordenador. | Aprovado |  | [R-14](evidencias/bug-bash-release2/R-14.png) e [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-15 | RF03 | Bloqueio de rota `/estudos/novo` | COORDENADOR / ADMINISTRADOR | Usuário logado | URL manual | Tela "Acesso negado" na própria rota, sem redirecionar | Coordenador em `/estudos/novo` vê "Acesso negado" sem sair da rota; a API recusa o cadastro de coordenador e administrador (403). | Aprovado |  | [R-15](evidencias/bug-bash-release2/R-15.png) e [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-16 | RF03 | Acesso sem autenticação | QUALQUER | Sessão inexistente | URL protegida | Redirecionamento para login | Sem sessão, `/estudos` leva para `/login`; a API responde 401 `NAO_AUTENTICADO`. | Aprovado |  | [R-16](evidencias/bug-bash-release2/R-16.png) e [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |

### RF04 — Cadastro e manutenção de estudos

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-17 | RF04 | Listagem de estudos por perfil | PESQUISADOR / COORDENADOR / ADMINISTRADOR | Usuários autenticados | Estudos existentes | Ações visíveis conforme perfil | Os três perfis listam os estudos (200). | Aprovado | Ações por perfil cobertas pelo R-15 e pelos testes de componente de `EstudosListaPage`. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-18 | RF04 | Cadastro de estudo com dados válidos | PESQUISADOR | Usuário autenticado | Título, objetivo, datas, limite | Estudo salvo e exibido em lista | Estudo criado (201) no estado PLANEJAMENTO. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-19 | RF04 | Formulário com data inválida e prazo inconsistente | PESQUISADOR | Usuário autenticado | Data de término anterior à inicial | Validação específica da regra de negócio | 400: "A data de término não pode ser anterior à data de início". | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-20 | RF04 | Limite de participantes inválido | PESQUISADOR | Usuário autenticado | Número zero ou negativo | Mensagem de erro correta | 400 com erro em `limiteParticipantes` para limite 0. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-21 | RF04 | Edição de estudo e bloqueio de estudo encerrado | PESQUISADOR | Estudo existente | Estado do estudo | Edição permitida quando aberto; bloqueada quando encerrado | Estudo em planejamento editado (200); estudo encerrado recusado com 409 `ESTUDO_ENCERRADO`: "Estudo encerrado não pode ser editado". | Aprovado |  | Execução manual pela API | 23/11/2026 |
| R-22 | RF04 | Busca e filtro por estado | QUALQUER | Lista de estudos | Filtros ativos | Atualização correta da contagem e da listagem | Filtro `estado=EXECUCAO` traz só estudos em execução; busca "Sono" encontra o estudo de demonstração. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |

### RF05 a RF11 — Fluxos de regra de negócio e recrutamento

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-23 | RF05 | Cadastrar critério de inclusão/exclusão | PESQUISADOR | Estudo em planejamento | Descrição e tipo | Critério salvo na ficha do estudo | Critérios de inclusão e de exclusão criados (201). | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-24 | RF06 | Cadastrar visita prevista | PESQUISADOR | Estudo ativo | Ordem e atividades do protocolo | Visitas criadas com ordem serial | Visitas previstas criadas (201), a primeira com 2 atividades. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-25 | RF07 | Transição de estado do estudo | PESQUISADOR | Estudo em planejamento | Estado alvo | Transições válidas aceitas (PLANEJAMENTO → RECRUTAMENTO → EXECUCAO → ENCERRADO; RECRUTAMENTO → PLANEJAMENTO); transição inválida ou para o mesmo estado rejeitada com mensagem | PLANEJAMENTO → PLANEJAMENTO e PLANEJAMENTO → EXECUCAO recusadas (409 `TRANSICAO_ESTADO_INVALIDA`); PLANEJAMENTO → RECRUTAMENTO aceita; o coordenador recebe 403. | Aprovado | RECRUTAMENTO → EXECUCAO também passou na preparação do R-31. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-26 | RF08 | Cadastro de candidatos | COORDENADOR | Estudo ativo | Dados do candidato e e-mail | Cadastro em estudo e estado inicial correto | Candidatos cadastrados (201) com status CADASTRADO. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-27 | RF09 | Avaliação de elegibilidade | COORDENADOR | Candidato cadastrado em estudo com critérios | Sim/Não para cada critério, com observação opcional | Sistema calcula o resultado: ELEGIVEL se atende todos os critérios de inclusão e nenhum de exclusão, senão NAO_ELEGIVEL. Todos os critérios precisam ser respondidos | Avaliação incompleta recusada (400); completa calcula ELEGIVEL. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-28 | RF10 | Consentimento simulado | COORDENADOR | Candidato elegível | Registro do consentimento (não existe recusa) | Consentimento salvo com data e responsável; segunda tentativa, candidato não elegível ou estudo encerrado são bloqueados com mensagem | Consentimento registrado (200); a segunda tentativa recebe 409 `CONSENTIMENTO_JA_REGISTRADO`. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-29 | RF11 | Inclusão com limite de vagas | COORDENADOR | Candidato elegível com consentimento | Vagas disponíveis | Inclusão válida; limite respeitado | Inclusão feita (200), vagas 1 de 1, com a conta do participante e a senha provisória. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-30 | RF11 | Inclusão com vagas esgotadas | COORDENADOR | Estudo sem vagas | Candidato elegível | Bloqueio com mensagem específica | 409 `VAGAS_ESGOTADAS`: "Todas as vagas do estudo estão ocupadas". | Aprovado | O E2E do fluxo de recrutamento também passou. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) e [E2E](evidencias/bug-bash-release2/E2E-fluxo-recrutamento.png) | 23/11/2026 |

## 5. RF12 a RF18: inclusão de fluxos confirmados e pendências

A documentação oficial em `MER-v1.md`, `MER-v2.md`, `MER-v3.md` e no `mobile/README.md` confirma a existência dos fluxos de visitas, avaliações, retirada e acompanhamento do participante. Ainda assim, alguns requisitos exigem confirmação mais explícita antes da execução de testes manuais, e esse cenário deve ser registrado como pendência de esclarecimento em vez de suposição.

### 5.1. Fluxos confirmados

| Requisito | Funcionalidade | Perfil principal | Situação |
| --- | --- | --- | --- |
| RF12 | Agendar visitas no estudo / acompanhamento do participante | COORDENADOR | Confirmado no MER-v1 |
| RF13 | Registrar comparecimento, ausência ou cancelamento de visitas | COORDENADOR | Confirmado no MER-v1 |
| RF14 | Registrar resultados fictícios das avaliações e manter histórico | COORDENADOR | Confirmado no MER-v1 |
| RF15 | Histórico de visitas (todas as situações) e resultados, por data | COORDENADOR / PESQUISADOR | Definido no MER-v3 (proposta) |
| RF16 | Retirada direta do participante pelo coordenador | COORDENADOR | Confirmado no MER-v1 |
| RF17 | Estudos do participante no app | PARTICIPANTE | Confirmado no `mobile/README.md` |
| RF18 | Visitas do participante no app | PARTICIPANTE | Confirmado no `mobile/README.md` |

### 5.2. Observação sobre o RF15

O RF15 (histórico de visitas e resultados) está definido no [MER-v3](../Diagramas/MER-v3.md), mas ainda como proposta. O caso R-43 cobre o requisito. Se a funcionalidade não estiver pronta no dia do bug bash, o caso fica como `Bloqueado`, e não como reprovado.

### 5.3. Casos de teste para RF12 a RF18

| ID | Requisito | Fluxo testado | Perfil | Pré-condições | Dados | Resultado esperado | Obtido | Status | Observações | Evidência | Data do teste |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-31 | RF12 | Agendamento de visita para participante incluído | COORDENADOR | Estudo ativo e participante incluído | Participante, data e visita prevista | Visita agendada e visível para o participante | Duas visitas agendadas (201); o participante entra com a senha provisória e vê as visitas em `/participantes/me/visitas`. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-32 | RF12 | Agendamento de visita para participante não incluído | COORDENADOR | Estudo ativo | Participante fora do estudo | Bloqueio do agendamento | 409 `PARTICIPANTE_NAO_INCLUIDO`. | Aprovado | A regra foi confirmada no MER-v3 (premissas da Sprint 3). | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-33 | RF13 | Registro de presença/ausência/cancelamento | COORDENADOR | Visita agendada | Resultado da visita | Estado da visita atualizado corretamente | Visita marcada como realizada (200); ausência antes do horário recusada (409 `VISITA_AINDA_NAO_OCORREU`); cancelamento sem motivo recusado (400). | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-34 | RF13 | Reagendamento e duplicidade de registros | COORDENADOR | Visita agendada | Nova data e motivo | Sistema rejeita operações inválidas | Reagendar visita realizada: 409 `VISITA_JA_FINALIZADA`; agendar de novo a mesma visita prevista: 409 `VISITA_JA_AGENDADA`; data fora da janela: 400; reagendamento válido: 200. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-35 | RF14 | Registro de resultado fictício da avaliação | COORDENADOR | Participante com visita e avaliação prevista | Dados da avaliação | Resultado anexado e persistente | Resultados gravados (200) e lidos pelo pesquisador; a tela de resultados abre com o formulário para o coordenador. | Aprovado |  | [R-35](evidencias/bug-bash-release2/R-35.png) e [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-36 | RF14 | Tentativa de avaliação fora do contexto válido | COORDENADOR | Visita sem participante ou sem estudo | Dados inconsistentes | Rejeição da operação | Visita agendada: 409 `VISITA_NAO_REALIZADA`; atividade de outra visita: 409 `ATIVIDADE_FORA_DA_VISITA`; visita inexistente: 404. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-43 | RF15 | Consulta do histórico do participante | COORDENADOR / PESQUISADOR | Participante com visitas em situações diferentes e resultados registrados | Participante incluído | Visitas (agendada, realizada, ausente, cancelada) e resultados listados por data | O pesquisador consulta o histórico (200): Triagem REALIZADA com 2 resultados e Retorno AGENDADA, em ordem de data; candidato não incluído recebe 409. | Aprovado | Endpoint do PR #67 (T-96), testado junto com a develop. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-37 | RF16 | Retirada direta do participante | COORDENADOR | Participante incluído | Motivo e confirmação | Estado do participante atualizado para retirado | Retirada feita (200): status RETIRADO, 1 visita agendada cancelada e vaga liberada. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-38 | RF16 | Retirada sem autorização ou com participante inexistente | COORDENADOR | Dados inválidos | ID ou status inconsistentes | Validação e bloqueio | Pesquisador: 403; candidato inexistente: 404; segunda retirada: 409 `PARTICIPANTE_JA_RETIRADO`; motivo vazio: 400. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-39 | RF17 | Visualização dos estudos do participante no app | PARTICIPANTE | Participante autenticado | Conta de participante | Lista de estudos incluídos com status/visita | `GET /participantes/me/estudos` traz o estudo de demonstração com participação INCLUIDO e a próxima visita. | Aprovado | Validado pela API e pelos testes do app (50 de 50). As telas do app não foram abertas em aparelho nesta execução. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-40 | RF17 | Acesso do participante fora do app | PESQUISADOR / COORDENADOR | Credenciais não de participante | Frontend web | Bloqueio de acesso conforme perfil | Pesquisador, coordenador e administrador recebem 403 nas rotas do app; o participante recebe 403 nas rotas da equipe. | Aprovado |  | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-41 | RF18 | Visualização das próximas visitas no app | PARTICIPANTE | Participante autenticado | Visitas agendadas | Lista correta com confirmação de presença | `GET /participantes/me/visitas` traz 3 visitas (AGENDADA e REALIZADA). | Aprovado | A confirmação de presença é do RF19 (Sprint 4). As telas do app não foram abertas em aparelho nesta execução. | [API](evidencias/bug-bash-release2/api-casos-2026-11-23.json) | 23/11/2026 |
| R-42 | RF18 | Solicitação de reagendamento ou confirmação de presença | PARTICIPANTE | Participante autenticado | Visita em aberto | Ação registrada e persistida | Não executado: confirmar presença e pedir reagendamento são do RF19, previsto para a Sprint 4. | Bloqueado | No app, as ações do RF19 e do RF20 estão desligadas (PR #65). Não é bug. |  | 23/11/2026 |

## 6. Distribuição dos testes entre os seis integrantes

Cada caso tem **um responsável**, que executa e preenche o caso, e **um apoio**, que ajuda e revisa. Todos os requisitos de RF01 a RF18 têm um responsável. Esta é a mesma divisão da seção 2.1 do [`bug-bash-2026-11-19.md`](./bug-bash-2026-11-19.md).

| Integrante | Papel | Requisitos | Casos | Apoio |
| --- | --- | --- | --- | --- |
| Arthur | Web 1 | RF01 a RF03: usuários, login e permissões | R-01 a R-16 | Mirelle |
| Nidlan | Web 2 | RF04 a RF07: estudos, critérios, visitas previstas e estados | R-17 a R-25 | Arthur |
| Jasmine | Backend | RF08 a RF11: candidatos, avaliação, consentimento e inclusão | R-26 a R-30 | Nidlan |
| Mirelle Casimiro | QA / DevOps | RF12 a RF15: agendamento, presença, resultados e histórico | R-31 a R-36 e R-43 | Jasmine |
| Maria Eduarda | Mobile / Backend | RF16 a RF18: retirada e app do participante | R-37 a R-42 | Mirelle |
| Adrielly | Gerente | Gestão: revisa os cards de Bug no Azure e define o responsável de cada um | — | Mirelle |

### 6.1. Quem corrige e quem retesta

- O **responsável pela correção** de um bug é quem cuida da área no código (web, backend ou mobile). A Adrielly define essa pessoa no card do Azure.
- O **reteste** é feito por quem encontrou o bug, ou pelo responsável do caso. A data e o resultado vão para o histórico de testes do Bug Bash.

## 7. Cronograma do Bug Bash

| Data | Atividade |
| --- | --- |
| 18/11/2026 | Publicação do roteiro de regressão e revisão final de cobertura |
| 19/11/2026 | Bug Bash de regressão e validação funcional |
| 20/11/2026 | Feriado; não considerar como dia útil de execução |
| 21/11/2026 em diante | Consolidação de resultados, correção, reteste dos bugs (com data e resultado no histórico) e fechamento |

## 8. Checklist de entrega

- [ ] Roteiro atualizado para RF01 a RF11.
- [ ] Fluxos RF12 a RF18 revisados e documentados conforme documentação oficial.
- [ ] Pendências de requisitos não confirmados identificadas e sinalizadas.
- [ ] Distribuição de execução entre os seis membros registrada.
- [ ] Datas do Bug Bash e do fechamento documentadas.
- [ ] Evidências e observações previstas no modelo do caso de teste.

## 9. Observações finais

- O que foi validado na Release 1 (RF01 a RF11) mantém a base do roteiro e deve continuar como referência principal.
- RF12 a RF18 são integrados ao roteiro como fluxos relevantes para o próximo ciclo, mas sem deduzir requisitos ainda não documentados oficialmente.
- Qualquer cenário sem documentação ou implementação suficiente deve ser marcado como `pendência de esclarecimento`, e não como caso executado.
