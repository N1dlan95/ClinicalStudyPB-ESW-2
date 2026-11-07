---
tags:
  - testes
  - regressao
release: 1
task: 3577
responsavel: Adrielly
---

# Roteiro de regressão: RF01 a RF04

Roteiro manual para conferir, antes da entrega da Release 1, que usuários, login e logout, acesso por perfil e cadastro de estudos continuam funcionando depois das entregas da Sprint 2.

## Como executar

- **Ambiente:** `docker compose up -d --build` na raiz do repositório. A web fica em `http://localhost:3000`.
- **Contas (migração V2), todas com a senha `Senha@123`:**

| Perfil | E-mail |
| --- | --- |
| ADMINISTRADOR | `admin@clinicalstudypb.test` |
| PESQUISADOR | `pesquisador@clinicalstudypb.test` |
| COORDENADOR | `coordenador@clinicalstudypb.test` |
| PARTICIPANTE | `participante@clinicalstudypb.test` |

- Preencha **Obtido** com `OK` ou `FALHA`. Em **Evidência**, coloque o nome do print (`reg-<ID>.png`) ou o número do card do bug.
- Cada falha vira um card no Azure DevOps, no modelo do arquivo [`bug-bash-2026-11-06.md`](bug-bash-2026-11-06.md).

**Executado por:** ______  **Data:** __/11/2026  **Commit da develop:** ______

## RF02: login e logout

| ID | Perfil | Passos | Resultado esperado | Obtido | Evidência |
| --- | --- | --- | --- | --- | --- |
| R01 | ADMINISTRADOR | Entrar com e-mail e senha corretos | Vai para a tela de Estudos, com o nome e o perfil no menu | | |
| R02 | PESQUISADOR | Entrar com e-mail e senha corretos | Vai para Estudos | | |
| R03 | COORDENADOR | Entrar com e-mail e senha corretos | Vai para Estudos | | |
| R04 | PARTICIPANTE | Entrar com e-mail e senha corretos | Fica no login com a mensagem "O painel web é exclusivo para a equipe do estudo. Use o aplicativo." | | |
| R05 | qualquer | Entrar com a senha errada | "E-mail ou senha incorretos. Confira os dados e tente novamente." | | |
| R06 | qualquer | Clicar em Entrar com os campos vazios | "Informe o e-mail." e "Informe a senha." nos campos, sem chamar a API | | |
| R07 | qualquer | Digitar um e-mail sem @ | "Informe um e-mail válido." | | |
| R08 | usuário inativo | Desativar um usuário de teste (R14) e entrar com ele | "Seu acesso está desativado. Fale com um administrador." | | |
| R09 | qualquer | Logado, recarregar a página (F5) | Continua logado na mesma tela | | |
| R10 | qualquer | Clicar em Sair | Volta para o login; ao abrir `/estudos` pela barra de endereço, cai no login de novo | | |

## RF01: usuários (somente administrador)

| ID | Perfil | Passos | Resultado esperado | Obtido | Evidência |
| --- | --- | --- | --- | --- | --- |
| R11 | ADMINISTRADOR | Abrir Usuários | Lista com as quatro contas da V2, com e-mail, perfil e status; filtros de perfil e de status funcionam | | |
| R12 | ADMINISTRADOR | Cadastrar um usuário PESQUISADOR com dados válidos | Volta para a lista e o usuário aparece | | |
| R13 | ADMINISTRADOR | Cadastrar com o e-mail de um usuário que já existe | Erro no campo E-mail ("Este e-mail já está cadastrado para outro usuário.") e link para o usuário existente | | |
| R14 | ADMINISTRADOR | Editar o usuário criado em R12 e mudar o status para inativo | Lista mostra o usuário como inativo | | |
| R15 | ADMINISTRADOR | Enviar o formulário de cadastro vazio | Aviso "Corrija 4 campos para cadastrar o usuário:" e erro em cada campo | | |
| R16 | ADMINISTRADOR | Abrir a edição do próprio usuário | O status fica desabilitado: "Você não pode desativar o próprio usuário." | | |

## RF03: acesso por perfil

| ID | Perfil | Passos | Resultado esperado | Obtido | Evidência |
| --- | --- | --- | --- | --- | --- |
| R17 | ADMINISTRADOR | Olhar o menu | Mostra Estudos e Usuários | | |
| R18 | PESQUISADOR | Olhar o menu e abrir `/usuarios` pela barra de endereço | Menu só com Estudos; `/usuarios` mostra "Acesso negado" | | |
| R19 | COORDENADOR | Abrir `/usuarios` e `/estudos/novo` pela barra de endereço | "Acesso negado" nas duas | | |
| R20 | ADMINISTRADOR | Abrir `/estudos/novo` pela barra de endereço | "Acesso negado" (só o pesquisador cadastra estudos) | | |
| R21 | PESQUISADOR | Abrir `/estudos/1/candidatos` pela barra de endereço | "Acesso negado" (candidatos são só do coordenador) | | |
| R22 | qualquer | Sem login, abrir `/estudos` | Vai para o login | | |

## RF04: cadastro de estudos

| ID | Perfil | Passos | Resultado esperado | Obtido | Evidência |
| --- | --- | --- | --- | --- | --- |
| R23 | PESQUISADOR | Abrir Estudos | Botão "+ Novo estudo" e link "Editar" nos estudos não encerrados | | |
| R24 | COORDENADOR | Abrir Estudos | Lista sem "+ Novo estudo" e sem "Editar"; com o link "Candidatos" | | |
| R25 | ADMINISTRADOR | Abrir Estudos | Só consulta: sem "+ Novo estudo", "Editar" ou "Candidatos" | | |
| R26 | PESQUISADOR | Cadastrar estudo com título, objetivo, início, término e limite válidos | Volta para a lista; o estudo aparece em Planejamento com o pesquisador como responsável | | |
| R27 | PESQUISADOR | Cadastrar sem a data de término | Aceita; a lista mostra "sem data" | | |
| R28 | PESQUISADOR | Término anterior ao início | "A data de término não pode ser anterior à data de início." | | |
| R29 | PESQUISADOR | Data inexistente (31/02/2027) | "Data inválida. Use o formato dd/mm/aaaa." | | |
| R30 | PESQUISADOR | Limite de participantes 0 | "Informe um número inteiro maior que zero." | | |
| R31 | PESQUISADOR | Enviar o formulário vazio | Aviso "Corrija 4 campos para cadastrar o estudo:" | | |
| R32 | PESQUISADOR | Editar o estudo de R26 e mudar o limite | Volta para a lista com o limite novo; o estado não muda | | |
| R33 | PESQUISADOR | Abrir `/estudos/<id>/editar` de um estudo encerrado | Aviso "Estudo encerrado não pode ser editado." e campos bloqueados | | |
| R34 | qualquer | Usar a busca e o filtro de estado da lista | A lista e o "Mostrando X de Y estudos" acompanham o filtro | | |

## Resultado

| Total de casos | OK | Falha | Bugs abertos (IDs no Azure) |
| --- | --- | --- | --- |
| 34 | | | |
