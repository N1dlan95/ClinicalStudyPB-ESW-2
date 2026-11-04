---
tags: [clinicalstudypb, eng-sw-2, api, openapi, swagger, sprint-1]
atualizado: 2026-10-24
status: rascunho
---

# Como acessar o contrato da API (openapi.yaml)

> [!info] O que é este arquivo
> O `openapi.yaml` descreve todas as rotas da API do ClinicalStudyPB da **Sprint 1 (RF01 a RF04)**: login, usuários, perfis e estudos. Ele é um texto em YAML. Para **ver** a documentação de forma visual (lista de rotas, exemplos e botão de testar), é preciso abri-lo em uma ferramenta de visualização. 
> Este arquivo se encontra nessa mesma pasta, mas é necessário procurar pelo gerenciador de arquivos.

Relacionados: [[contexto-desenvolvimento]] · [[duvidas-mer-professora]]

---

## 1. Onde foi guardado no repositório

Sugestão de caminho, na raiz do projeto:

```
clinicalstudypb/
└── docs/
    └── api/
	    └──como-acessar-contrato-api
        └── openapi.yaml
    └──Diagramas
```

> [!note] Por quê
> O contrato é o combinado entre backend, web e mobile. Versionado no Git, todos veem a mesma versão e as mudanças passam por revisão de PR.

---

## 2. Formas de abrir (da mais simples para a mais completa)

### Opção A: Swagger Editor online (a mais rápida)

Não instala nada.

1. Abra [editor.swagger.io](https://editor.swagger.io).
2. Apague o texto de exemplo à esquerda.
3. Abra o `openapi.yaml` em um editor de texto (Bloco de Notas, VS Code), copie tudo e cole no painel da esquerda.
   - Alternativa: menu **File → Import file** e escolha o arquivo.
4. A documentação aparece à direita. Se houver erro de sintaxe, ele é apontado no painel esquerdo.

> [!warning] Cuidado
> Os dados ficam só no navegador. Se fechar a aba sem salvar, perde as alterações feitas lá. Edite sempre o arquivo do repositório.

### Opção B: VS Code (bom para quem já edita o arquivo lá)

1. Abra a pasta do projeto no VS Code.
2. Na aba de extensões (`Ctrl+Shift+X`), procure por **OpenAPI** ou **Swagger** e instale uma extensão de visualização (por exemplo, "OpenAPI (Swagger) Editor"). Os nomes das extensões mudam com o tempo; escolha uma com muitas instalações e boa avaliação.
3. Abra o `openapi.yaml` e use o comando de preview da extensão (paleta de comandos `Ctrl+Shift+P`, digitando "OpenAPI" ou "Swagger preview").

### Opção C: Swagger UI com Docker (igual ao que a professora vai ver)

Requer o Docker Desktop em execução. No **PowerShell**, dentro da pasta onde está o `openapi.yaml`:

```powershell
docker run --rm -p 8081:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v "${PWD}:/spec" swaggerapi/swagger-ui
```

No **cmd**, troque `${PWD}` por `%cd%`:

```cmd
docker run --rm -p 8081:8080 -e SWAGGER_JSON=/spec/openapi.yaml -v "%cd%:/spec" swaggerapi/swagger-ui
```

Depois abra no navegador: `http://localhost:8081`

O que cada parte faz:

| Trecho | Significado |
|---|---|
| `-p 8081:8080` | publica a porta 8080 do contêiner na porta 8081 do seu computador (a 8080 fica livre para o backend Spring) |
| `-e SWAGGER_JSON=...` | diz ao Swagger UI qual arquivo mostrar |
| `-v "${PWD}:/spec"` | "empresta" a pasta atual para dentro do contêiner |
| `--rm` | apaga o contêiner quando você parar (Ctrl+C) |

### Opção D: Redocly (documentação em página única, sem Docker)

Requer o Node.js (que você já usa para o Vite):

```powershell
npx @redocly/cli preview-docs openapi.yaml
```

Abre uma página local com a documentação. Para só **verificar erros** no contrato:

```powershell
npx @redocly/cli lint openapi.yaml
```

### Opção E: Importar no Postman ou Insomnia

1. **Postman:** botão **Import**, escolha o `openapi.yaml`.
2. Ele cria uma coleção com todas as rotas prontas para testar.
3. O Insomnia também importa o arquivo da mesma forma.

---

## 3. Como navegar no Swagger

| Elemento | Para que serve |
|---|---|
| Grupos (**Autenticação**, **Usuários**, **Perfis**, **Estudos**) | agrupam as rotas por assunto |
| Cada linha (por exemplo, `POST /usuarios`) | clique para abrir o detalhe |
| **Parameters** | o que vai na URL ou na query (`page`, `size`, `busca`) |
| **Request body** | o JSON que a rota espera receber |
| **Responses** | cada código possível (200, 400, 401...) e o formato da resposta |
| **Schemas** (no final da página) | os formatos de dados, que viram os DTOs no backend |
| **Authorize** | onde colar o token depois do login |

> [!tip] Botão "Try it out"
> Ele só funciona se o **backend estiver rodando** em `http://localhost:8080`. Sem o backend, a chamada falha, mas a leitura do contrato continua funcionando normalmente.

---

## 4. Depois que o backend existir (springdoc)

Com a dependência **springdoc-openapi** no `pom.xml` (ainda na lista de pendências do backend), o Spring gera a página do Swagger UI sozinho, a partir do código dos controllers:

| O que | Endereço (com o backend rodando) |
|---|---|
| Swagger UI | `http://localhost:8080/swagger-ui/index.html` |
| Contrato gerado em JSON | `http://localhost:8080/v3/api-docs` |

> [!note] Se usar o prefixo `/api`
> Se o prefixo for configurado com `server.servlet.context-path=/api`, os endereços ganham o prefixo, por exemplo `http://localhost:8080/api/swagger-ui/index.html`.

**Como usar os dois juntos:**

1. O `openapi.yaml` é o **combinado** (o que a API deveria fazer).
2. O Swagger UI do springdoc mostra o que o código **realmente** faz.
3. Compare os dois. Toda diferença é um erro de um dos lados e deve ser corrigida ou discutida na equipe.

O enunciado pede a documentação da API no Swagger UI no README da release, então inclua o endereço e uma captura de tela.
