# Pendência: data e hora nas visitas

**Origem:** revisão da tela web de visitas previstas (RF06, Sprint 2), feita por Nidlan Hendell.
**Situação:** em aberto. A tela tem só uma prévia visual; banco, API e app móvel não mudaram.

## Contexto

Hoje a visita prevista (`visita_prevista`, migração `V6__criar_visita_prevista.sql`) é um **modelo do protocolo**:

| Campo          | Significado                                          |
| -------------- | ---------------------------------------------------- |
| `dia_previsto` | Dias contados a partir da inclusão do participante (D0) |
| `janela_dias`  | Tolerância, para mais ou para menos, em dias         |

Não existe **data** nem **hora** gravadas. Cada participante entra no estudo numa data diferente, então a data da visita de um participante só pode ser calculada a partir da data de inclusão dele.

Na revisão, o modelo atual foi considerado difícil de ler. A tela de visitas (`/estudos/:id/visitas-previstas`) não mostra datas concretas.

## O que foi feito agora (somente frontend)

Na tela [`VisitasPrevistasPage.tsx`](../../../frontend/frontend/src/features/estudos/VisitasPrevistasPage.tsx):

- Card **"Prévia de calendário"** com dois campos:
  - **Data de referência (D0)**: começa com a data de início do estudo;
  - **Horário sugerido**: começa em 08:00.
- No formulário, a visita mostra a **data prevista** (data + hora) e a **janela** já convertidas.
- Cada visita cadastrada mostra a data/hora calculada e a janela em datas.

> **Atenção:** a data de referência e o horário **não são salvos**. Servem só para visualizar o cronograma. Ao recarregar a página, voltam aos valores padrão.

## O que falta (ajuste pendente)

1. **Definir o modelo com a equipe e o professor.** Opções:
   - **A. Horário padrão no modelo da visita:** coluna `horario_previsto TIME NULL` em `visita_prevista`. A data continua relativa (D0 + `dia_previsto`).
   - **B. Agendamento por participante (recomendado):** nova tabela (ex.: `visita_agendada`) com `participante_id`, `visita_prevista_id`, `data_hora_prevista TIMESTAMP`, `status`. Gerada na inclusão do participante a partir de `data_inclusao + dia_previsto`, e ajustável dentro da janela.
2. **Backend:** migração Flyway nova (`V*__...sql`), entidade, DTOs (`VisitaPrevistaEntrada`/`VisitaPrevista` ou novos DTOs de agendamento), regras de validação (horário dentro do expediente, data dentro da janela) e testes.
3. **Contrato:** atualizar `Docs/ClinicalStudyPB-Docs/api/openapi.yaml`.
4. **Frontend web:** trocar a prévia local pelos dados da API. Se for a opção B, criar uma tela de agenda do participante.
5. **App móvel:** mostrar ao participante a data e hora das próximas visitas (se for a opção B).
6. **Testes:** atualizar `VisitasPrevistasPage.test.tsx` e os testes do backend em `visitaprevista/`.

## Critério de pronto

- Data e hora das visitas persistidas e devolvidas pela API.
- A tela web mostra datas reais, não uma simulação.
- Esta pendência é removida ou marcada como resolvida no planejamento da sprint.
