# Protótipo RF14–RF16: resultados, histórico do participante e retirada (T-93)

Capturas do protótipo navegável das telas web de acompanhamento da Release 2. O protótipo segue o visual do painel web e as regras já implementadas na API: só o coordenador registra resultados e retiradas, e a retirada cancela só as visitas agendadas.

- **Protótipo navegável:** https://claude.ai/artifact/3fT7o83A8LhjAb376mHZo8 (abrir o histórico e usar o botão Play para navegar).
- **Dados:** fictícios, do estudo de demonstração da Release 2.

| # | Tela | Requisito | Captura |
|---|------|-----------|---------|
| 1 | Histórico do participante: cabeçalho (nome, estudo, data de inclusão, status) e linha do tempo das visitas com status e resultados | RF15 | [01](01-historico-participante.png) |
| 2 | Retirada: diálogo com motivo e aviso das visitas agendadas que serão canceladas | RF16 | [02](02-retirada-dialogo.png) |
| 3 | Retirada: erro de motivo obrigatório | RF16 | [03](03-retirada-motivo-obrigatorio.png) |
| 4 | Participante retirado: data, responsável e motivo; visita agendada cancelada | RF15, RF16 | [04](04-participante-retirado.png) |
| 5 | Erro: participante já retirado | RF16 | [05](05-erro-participante-ja-retirado.png) |
| 6 | Registro de resultados: uma linha por atividade, com resultado e observação | RF14 | [06](06-resultados-formulario.png) |
| 7 | Resultados: erro de resultado vazio | RF14 | [07](07-resultados-resultado-obrigatorio.png) |
| 8 | Resultados salvos | RF14 | [08](08-resultados-salvos.png) |
| 9 | Resultados em modo leitura (pesquisador e administrador) | RF14 | [09](09-resultados-modo-leitura-pesquisador.png) |
| 10 | Erro: visita não realizada | RF14 | [10](10-erro-visita-nao-realizada.png) |
| 11 | Estados carregando, vazio (sem visitas, visita sem atividades) e erro de carga | RF14, RF15 | [11](11-estados-vazio-carregando-erro.png) |

## Fluxo

1. Histórico → **Ver e editar resultados** (visita realizada) → registro de resultados → salvar.
2. Histórico → **Ver resultados** (visita agendada) → aviso de visita não realizada.
3. Histórico → **Registrar retirada** → diálogo → motivo obrigatório → confirmar → participante retirado.
