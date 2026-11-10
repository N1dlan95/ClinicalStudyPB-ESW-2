# Teste E2E web (task 3574)

Fluxo completo da Release 1 com Playwright, todo pela tela e com o perfil certo em cada etapa:

1. **Pesquisador:** cadastra o estudo (limite de 1 vaga), cadastra um critério de inclusão e um de exclusão e inicia o recrutamento.
2. **Coordenador:** cadastra dois candidatos, avalia os dois como elegíveis, registra o consentimento e inclui o primeiro.

Casos de erro cobertos: inclusão bloqueada sem consentimento e inclusão bloqueada com as vagas esgotadas (na tela e na API, `409 VAGAS_ESGOTADAS`).

## Como rodar

Com o ambiente no ar pelo Docker Compose (banco, backend e frontend), na raiz do repositório:

```bash
docker compose up -d --build
```

Depois, na pasta `e2e`:

```bash
npm install
npx playwright install chromium
npm test
```

Para ver o navegador durante o teste, use `npm run test:headed`.

## Evidências

- **Prints de cada etapa:** pasta [`evidencias/`](evidencias/), sobrescritos a cada execução.
- **Relatório HTML, com os prints e o vídeo:** fica em `e2e/playwright-report`. Para abrir, rode `npm run relatorio`.

| Print | Etapa |
| --- | --- |
| `01-cadastro-estudo` | Formulário do estudo preenchido |
| `02-estudo-na-lista` | Estudo em Planejamento na lista |
| `03-criterios` | Critérios de inclusão e exclusão cadastrados |
| `04-recrutamento-iniciado` | Estado alterado para Recrutamento |
| `05-candidatos-cadastrados` | Dois candidatos com status Cadastrado |
| `06-avaliacao-elegivel` | Avaliação registrada como Elegível |
| `07-erro-inclusao-sem-consentimento` | Inclusão bloqueada sem consentimento |
| `08-consentimento-registrado` | Consentimento registrado |
| `09-candidato-incluido` | Candidato incluído, vaga ocupada (1 de 1) |
| `10-erro-vagas-esgotadas` | Segunda candidata bloqueada por vagas esgotadas |

## Variáveis

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:3000` | Endereço do frontend. Com o Vite (`npm run dev`), use `http://localhost:5173`. |

Cada execução cria um estudo novo com título único (`Estudo E2E <número>`), então o teste pode rodar várias vezes no mesmo banco.
