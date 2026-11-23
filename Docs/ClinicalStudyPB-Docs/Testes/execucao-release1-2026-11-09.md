---
tags:
  - testes
  - regressao
  - bug-bash
release: 1
task: 3577
data: 2026-11-09
executado-por: Adrielly
---

# Execução dos testes da Release 1 (09/11/2026)

Resultado do [roteiro de regressão](roteiro-regressao-rf01-rf04.md) e do [bug bash](bug-bash-2026-11-06.md).

## Resumo

| Teste | Casos | OK | Falha |
| --- | --- | --- | --- |
| Regressão RF01 a RF04 | 34 | 34 | 0 |
| Bug bash RF05 a RF11 | 24 | 23 | 1 |

- **Bugs:** 1, de severidade baixa ([detalhes](#bug-encontrado)).
- **Bloqueia a entrega?** Não.

## Ambiente

- Docker Compose, develop no commit `4d69f04`.
- Banco recriado: migrações V1 a V10, com os dados de demonstração da V10.
- Execução automatizada com Playwright: no navegador Chromium para as telas e direto na API para as regras sem tela.
- Prints em [`evidencias/regressao/`](evidencias/regressao/) e [`evidencias/bug-bash/`](evidencias/bug-bash/).

## Bug encontrado

**[Candidatos] Filtro de status não tem a opção "Retirado"**

| Severidade | Perfil | Card no Azure | Situação |
| --- | --- | --- | --- |
| Baixa | COORDENADOR | a abrir | Aberto |

- **Onde:** Candidatos do "Estudo de Qualidade do Sono em Adultos".
- **Esperado:** os filtros de status incluem "Retirado".
- **Obtido:** só aparecem Todos, Cadastrado, Elegível, Inelegível e Incluído. A candidata Renata Dias aparece como Retirado, mas não dá para filtrar por esse status.
- **Causa provável:** falta `RETIRADO` na lista `FILTROS` de `CandidatosListaPage.tsx`.
- **Print:** [B24](evidencias/bug-bash/B24.png)

## Regressão RF01 a RF04

Passos e resultados esperados no [roteiro](roteiro-regressao-rf01-rf04.md).

| ID | RF | Caso | Resultado | Print |
| --- | --- | --- | --- | --- |
| R01 | RF02 | Login do administrador | OK | [R01](evidencias/regressao/R01.png) |
| R02 | RF02 | Login do pesquisador | OK | [R02](evidencias/regressao/R02.png) |
| R03 | RF02 | Login do coordenador | OK | [R03](evidencias/regressao/R03.png) |
| R04 | RF02 | Participante barrado no painel web | OK | [R04](evidencias/regressao/R04.png) |
| R05 | RF02 | Senha errada | OK | [R05](evidencias/regressao/R05.png) |
| R06 | RF02 | Campos vazios sem chamar a API | OK | [R06](evidencias/regressao/R06.png) |
| R07 | RF02 | E-mail sem @ | OK | [R07](evidencias/regressao/R07.png) |
| R08 | RF02 | Usuário inativo barrado | OK | [R08](evidencias/regressao/R08.png) |
| R09 | RF02 | F5 mantém a sessão | OK | [R09](evidencias/regressao/R09.png) |
| R10 | RF02 | Sair | OK | [R10](evidencias/regressao/R10.png) |
| R11 | RF01 | Lista de usuários e filtros | OK | [R11](evidencias/regressao/R11.png) |
| R12 | RF01 | Cadastrar usuário | OK | [R12](evidencias/regressao/R12.png) |
| R13 | RF01 | E-mail duplicado | OK | [R13](evidencias/regressao/R13.png) |
| R14 | RF01 | Desativar usuário | OK | [R14](evidencias/regressao/R14.png) |
| R15 | RF01 | Cadastro de usuário vazio | OK | [R15](evidencias/regressao/R15.png) |
| R16 | RF01 | Não desativar o próprio usuário | OK | [R16](evidencias/regressao/R16.png) |
| R17 | RF03 | Menu do administrador | OK | [R17](evidencias/regressao/R17.png) |
| R18 | RF03 | Pesquisador sem acesso a Usuários | OK | [R18](evidencias/regressao/R18.png) |
| R19 | RF03 | Coordenador sem acesso a Usuários e Novo estudo | OK | [R19](evidencias/regressao/R19.png) |
| R20 | RF03 | Administrador sem acesso a Novo estudo | OK | [R20](evidencias/regressao/R20.png) |
| R21 | RF03 | Pesquisador sem acesso a Candidatos | OK | [R21](evidencias/regressao/R21.png) |
| R22 | RF03 | Sem login vai para o login | OK | [R22](evidencias/regressao/R22.png) |
| R23 | RF04 | Ações do pesquisador na lista | OK | [R23](evidencias/regressao/R23.png) |
| R24 | RF04 | Ações do coordenador na lista | OK | [R24](evidencias/regressao/R24.png) |
| R25 | RF04 | Administrador só consulta | OK | [R25](evidencias/regressao/R25.png) |
| R26 | RF04 | Cadastrar estudo | OK | [R26](evidencias/regressao/R26.png) |
| R27 | RF04 | Estudo sem data de término | OK | [R27](evidencias/regressao/R27.png) |
| R28 | RF04 | Término antes do início | OK | [R28](evidencias/regressao/R28.png) |
| R29 | RF04 | Data inexistente | OK | [R29](evidencias/regressao/R29.png) |
| R30 | RF04 | Limite zero | OK | [R30](evidencias/regressao/R30.png) |
| R31 | RF04 | Formulário vazio | OK | [R31](evidencias/regressao/R31.png) |
| R32 | RF04 | Editar o limite | OK | [R32](evidencias/regressao/R32.png) |
| R33 | RF04 | Estudo encerrado bloqueado | OK | [R33](evidencias/regressao/R33.png) |
| R34 | RF04 | Busca e filtro de estado | OK | [R34](evidencias/regressao/R34.png) |

## Bug bash RF05 a RF11

| ID | RF | Verificação | Esperado | Resultado | Print |
| --- | --- | --- | --- | --- | --- |
| B01 | RF05 | Cadastrar critério | 201 pesquisador, 403 coordenador | OK | API |
| B02 | RF05 | Descrição com 2 caracteres | 400 | OK | API |
| B03 | RF05 | Critério em estudo encerrado | 409 | OK | API |
| B04 | RF06 | Cadastrar visita com atividade | 201 pesquisador, 403 coordenador | OK | API |
| B05 | RF06 | Visita com ordem repetida | 409 | OK | API |
| B06 | RF07 | Encerrado voltar para Recrutamento | 409 | OK | API |
| B07 | RF08 | E-mail repetido no estudo | 409 | OK | API |
| B08 | RF08 | Candidato em estudo em Planejamento | 409 | OK | API |
| B09 | RF08 | Pesquisador cadastrar candidato | 403 | OK | API |
| B10 | RF09 | Avaliação incompleta | Rejeitada | OK | API |
| B11 | RF09 | Reavaliar com consentimento | 409 | OK | API |
| B12 | RF10 | Consentimento de inelegível | 409 | OK | API |
| B13 | RF10 | Consentimento repetido | 200, depois 409 | OK | API |
| B14 | RF11 | Incluir sem vagas | 409 | OK | API |
| B15 | RF11 | Incluir candidato só cadastrado | 409 | OK | API |
| B16 | RF11 | Pesquisador incluir | 403 | OK | API |
| B17 | RF11 | Incluir elegível com consentimento | 200 e Incluído | OK | API |
| B18 | RF08 | Busca e filtro de candidatos | Lista filtrada | OK | [B18](evidencias/bug-bash/B18.png) |
| B19 | RF08 | Cadastrar candidato pela tela | Aparece como Cadastrado | OK | [B19](evidencias/bug-bash/B19.png) |
| B20 | RF08 | Estudo fora de recrutamento | Aviso e botão desabilitado | OK | [B20](evidencias/bug-bash/B20.png) |
| B21 | RF11 | Vagas esgotadas | "esgotadas" e Incluir desabilitado | OK | [B21](evidencias/bug-bash/B21.png) |
| B22 | RF11 | Incluir pela tela | Confirmação e contador atualizado | OK | [B22](evidencias/bug-bash/B22.png) |
| B23 | RF09 | Avaliar pela tela | Elegível registrado | OK | [B23](evidencias/bug-bash/B23.png) |
| B24 | RF08 | Filtrar retirados | Opção "Retirado" | FALHA | [B24](evidencias/bug-bash/B24.png) |

## Observações

- R23: além de "Editar", a lista do pesquisador agora mostra "Critérios", "Visitas" e "Estado" (RF05 a RF07). O caso continua válido.
- No print de página inteira, o menu lateral parece terminar antes do fim. Não é bug: o menu é fixo e acompanha a rolagem.
- Dados criados só no banco local: o usuário `qa.regressao.<número>@clinicalstudypb.test`, dois estudos "Estudo Regressao QA" e um candidato "Candidato Bug Bash".
