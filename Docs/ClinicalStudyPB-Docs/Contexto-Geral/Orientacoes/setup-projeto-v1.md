---
tags: [clinicalstudypb, setup, spring-boot, react, eng-sw-2]
sprint: 1
atualizado: 2026-10-23
---

# Setup do projeto — ClinicalStudyPB

> [!info] Para quê serve este documento
> Registro do que foi feito na montagem da base do projeto na [[sprint-1]] e das decisões tomadas, para que toda a equipe entenda a estrutura antes de começar a desenvolver.

## 1. Stack escolhida (Stack A)

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot (Maven) |
| Web | React + TypeScript (Vite) |
| Mobile | React Native + Expo (TypeScript) |
| Banco | PostgreSQL (em contêiner Docker) |
| Testes | JUnit, Mockito, Vitest, Jest, Playwright |

> [!note] TypeScript
> O enunciado da Stack A indica **React + TypeScript** (web) e compartilhamento de conhecimento de TypeScript entre web e mobile. Por isso o projeto web usa o template `react-ts`. TypeScript é JavaScript com tipos: todo JavaScript válido funciona nele.

## 2. Estrutura do repositório

```
clinicalstudypb/
├── backend/            ← Spring Boot (API REST)
├── web/                ← React (pesquisador, coordenador, administrador)
├── mobile/             ← React Native + Expo (participante)
├── docker-compose.yml  ← banco (e depois os outros serviços)
├── releases/           ← SOMENTE documentação de cada entrega
│   ├── release1/README.md
│   ├── release2/README.md
│   └── release3/README.md
└── README.md
```

> [!warning] Nome da pasta do React
> Neste documento a pasta é `web` (combina com "aplicação web" do enunciado). Se a equipe preferir `frontend`, escolha **um nome só** e use-o em README, Docker e CI.

### Por que o código não fica dentro de `releases/`

- O projeto é **um sistema que evolui**: "os requisitos entregues nas releases anteriores deverão continuar funcionando".
- A separação entre versões é feita pelo **Git**, com **tags** (`release1`, `release2`, `release3`). Para ver o código da Release 1: `git checkout release1`.
- `releases/` guarda apenas o README de cada entrega (objetivo, requisitos, capturas, testes, burndown, pendências).
- Na Release 3 outra equipe recebe o repositório inteiro, que precisa ser um único projeto executável.

### Git e pastas vazias

O Git **não guarda pastas vazias**. Crie um arquivo `.gitkeep` dentro de cada pasta vazia que precise existir no repositório (por exemplo `mobile/`, e os pacotes do backend ainda sem código).

## 3. Backend (Spring Boot)

### Pré-requisitos
- JDK 21 (`java -version`)
- IDE: IntelliJ IDEA Community ou VS Code com *Extension Pack for Java*
- Git

### Como o projeto foi gerado

Em **https://start.spring.io**:

| Campo | Valor |
|---|---|
| Project | Maven |
| Language | Java |
| Spring Boot | versão estável padrão (nunca SNAPSHOT/RC) |
| Group | `br.com.clinicalstudypb` |
| Artifact | `clinicalstudypb-api` |
| Packaging | Jar |
| Java | 21 |

O zip foi extraído dentro de `backend/` (o `pom.xml` fica direto em `backend/`).

### Dependências e o que cada uma faz

| Dependência | O que faz | Onde será usada |
|---|---|---|
| **Spring Web** | Cria a API REST (recebe HTTP, devolve JSON). Traz o Tomcat embutido. | Todos os controllers |
| **Spring Data JPA** | Acesso ao banco sem SQL manual: classes `@Entity` viram tabelas; `JpaRepository` traz salvar/buscar/excluir. | Entidades e repositórios |
| **PostgreSQL Driver** | Permite o Java conectar ao PostgreSQL. | Configuração do `application.yml` |
| **Validation** | Valida dados de entrada (`@NotBlank`, `@Email`, `@Min`) e devolve erro 400. | Validações de RF01 e RF04 |
| **Spring Security** | Autenticação, autorização por perfil e criptografia de senha (BCrypt). | RF02 e RF03 |
| **Flyway Migration** | Versiona o banco: scripts `V1__...sql`, `V2__...sql` aplicados em ordem, uma vez. | Criação das tabelas e dados fictícios |
| **DevTools** (opcional) | Reinicia a aplicação ao salvar arquivos. | Apenas desenvolvimento |

O `spring-boot-starter-test` (JUnit + Mockito) é adicionado automaticamente pelo Initializr.

### O que ainda falta adicionar

- **springdoc-openapi** (Swagger UI), exigido pelo projeto. Conferir a versão compatível com o Spring Boot em springdoc.org. A documentação ficará em `/swagger-ui.html`.
- **JaCoCo** (plugin do Maven) para a cobertura mínima de **80%** das linhas de negócio. Entra junto do CI.
- *(a decidir na arquitetura)* biblioteca de JWT, se o login usar token.
- *(opcional)* Testcontainers, para testes de integração com PostgreSQL real.
- Lombok foi **deixado de fora** de propósito, para quem está aprendendo ver o código completo.

### Organização do código (arquitetura em camadas)

O MVC clássico pressupõe que o servidor gera as telas. Aqui a *View* é o React, separado, que consome JSON. Por isso o backend usa **camadas**:

| Camada | Papel | Exemplo |
|---|---|---|
| Controller | Recebe a requisição HTTP e devolve a resposta. Sem regra de negócio. | `EstudoController` |
| Service | Regras de negócio (limite de participantes, estados do estudo). Alvo dos testes unitários. | `EstudoService` |
| Repository | Acesso ao banco. | `EstudoRepository` |
| Entity | Representa as tabelas. | `Estudo` |
| DTO | Objetos que trafegam na API, sem expor a entidade. | `EstudoRequest`, `EstudoResponse` |

Organização das pastas **por funcionalidade** (e não por camada):

```
backend/src/main/java/br/com/clinicalstudypb/
├── ClinicalstudypbApiApplication.java   ← gerada pelo Initializr
├── usuario/     (Controller, Service, Repository, Entity, DTOs)
├── estudo/
├── auth/
└── config/

backend/src/main/resources/
├── application.yml
└── db/migration/
    └── V1__criar_tabelas.sql

backend/src/test/java/br/com/clinicalstudypb/
└── (mesma estrutura de pacotes do código)
```

> [!tip] Regras importantes
> - Os pacotes novos precisam ficar **dentro do pacote da classe principal** (`br.com.clinicalstudypb`), senão o Spring não encontra os componentes.
> - A linha `package ...;` no topo do arquivo deve coincidir com a pasta.
> - O caminho `db/migration` é o padrão do Flyway; não mude o nome.
> - Esta organização é uma **sugestão** a ser confirmada na discussão de arquitetura.

### Configuração do banco (`application.yml`)

Renomear `application.properties` para `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/clinicalstudy
    username: clinical
    password: clinical_dev
  jpa:
    hibernate:
      ddl-auto: validate   # quem cria as tabelas é o Flyway
  flyway:
    enabled: true
```

As credenciais são **fictícias, de desenvolvimento**. Nunca commitar senhas reais.

### Executar e verificar

```
cd backend
./mvnw clean package -DskipTests   # deve terminar com BUILD SUCCESS
./mvnw spring-boot:run             # Windows: mvnw.cmd spring-boot:run
```

> [!warning] Armadilhas
> - O backend **só sobe com o banco rodando** (Spring e Flyway tentam conectar).
> - Com o Spring Security, **todos os endpoints retornam 401** e o console mostra uma senha aleatória. É esperado até configurarmos RF02/RF03. Para testar antes, use um `SecurityConfig` temporário que libere tudo.
> - Se aparecer erro de "banco não suportado" no Flyway, falta o módulo `flyway-database-postgresql`.

## 4. Banco de dados e Docker

> [!info] Responsável
> O ambiente Docker (T-07) é do **QA / DevOps**. O trecho abaixo é um ponto de partida.

### Conceitos
- **Imagem:** molde pronto (PostgreSQL já instalado).
- **Contêiner:** instância em execução criada a partir da imagem.
- **Volume:** espaço em disco que guarda os dados fora do contêiner.
- **Docker Compose:** arquivo que descreve os contêineres e sobe tudo com um comando.

### `docker-compose.yml` (raiz do repositório)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: clinicalstudy
      POSTGRES_USER: clinical
      POSTGRES_PASSWORD: clinical_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Comandos

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Sobe o banco em segundo plano |
| `docker compose ps` | Mostra se está rodando |
| `docker compose logs db` | Mostra os logs |
| `docker compose exec db psql -U clinical -d clinicalstudy` | Abre o terminal SQL (sair: `\q`) |
| `docker compose down` | Para e remove o contêiner (**dados continuam**) |
| `docker compose down -v` | Remove o contêiner **e apaga os dados** |

### Não é preciso instalar o PostgreSQL na máquina

Ele roda no contêiner. Para **ver os dados**, instale apenas um cliente (DBeaver, pgAdmin, aba Database do IntelliJ ou extensão do VS Code) e conecte em `localhost:5432` com o usuário e a senha acima.

### Armadilhas
- **Porta 5432 em uso** (PostgreSQL instalado localmente): troque para `"5433:5432"` e use `localhost:5433` no Spring.
- **Mudou usuário/senha e nada mudou:** as variáveis `POSTGRES_*` só valem na primeira criação do volume. Use `docker compose down -v` (apaga os dados).
- **Docker não está rodando:** abra o Docker Desktop e espere iniciar.

## 5. Web (React + TypeScript)

### Pré-requisito
Node.js **LTS** (`node -v`, `npm -v`).

### Criar o projeto

Na raiz do repositório:

```
npm create vite@latest web -- --template react-ts
cd web
npm install
npm run dev
```

Abra `http://localhost:5173` (parar com `Ctrl + C`).

> [!warning] Duas perguntas diferentes durante a criação
> - **Pergunta do npm** (`Need to install the following packages: create-vite@... Ok to proceed?`): responda **`y`**. Respondendo "não", aparece `npm error canceled`.
> - **Perguntas do Vite** (opções experimentais, instalar e iniciar agora): responda **No**.
> - Se a pasta tiver `.gitkeep`, apague antes (PowerShell: `rm web\.gitkeep`; cmd: `del web\.gitkeep`) ou escolha *Ignore files and continue*.

### O que o Vite gera

```
web/
├── index.html        ← página única onde o React é montado
├── package.json      ← dependências e scripts
├── vite.config.ts    ← configuração do Vite
├── tsconfig*.json    ← configuração do TypeScript
└── src/
    ├── main.tsx      ← ponto de entrada
    └── App.tsx       ← componente raiz
```

### Dependências base

```
npm install react-router-dom axios
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

| Pacote | Para quê |
|---|---|
| react-router-dom | Navegação entre telas e proteção de rotas por perfil (RF03) |
| axios | Chamadas HTTP à API |
| vitest + testing-library | Testes de componentes |

O **Playwright** (E2E) fica para o QA/DevOps, quando houver telas.

### Estrutura de `src/` (por funcionalidade)

```
src/
├── main.tsx
├── App.tsx
├── routes/          ← rotas e proteção por perfil
├── services/
│   └── api.ts       ← instância do axios
├── features/
│   ├── auth/        ← login/logout (RF02)
│   ├── usuarios/    ← RF01
│   └── estudos/     ← RF04
└── components/      ← componentes reutilizáveis
```

Cada desenvolvedor trabalha na sua pasta de `features/`, o que reduz conflitos de merge.

### Conexão com o backend (proxy do Vite)

React (porta 5173) e Spring (porta 8080) são origens diferentes, e o navegador bloqueia (**CORS**). No desenvolvimento, o proxy resolve. `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

`src/services/api.ts`:

```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})
```

Em `package.json`, no bloco `scripts`, adicionar: `"test": "vitest run"`.

> [!warning] Combinado com o backend
> Os endpoints do Spring devem começar com **`/api`** (por exemplo `@RequestMapping("/api/estudos")`).

### Verificação
- [ ] `npm run dev` abre a página
- [ ] `npm run build` termina sem erros
- [ ] `npm test` executa o Vitest
- [ ] Nunca commitar `node_modules/` (colegas rodam `npm install` após clonar)

## 6. Mobile

Responsabilidade do **desenvolvedor mobile** (T-19): projeto React Native + Expo com TypeScript, executando em emulador ou dispositivo. A pasta `mobile/` já deve existir no repositório (com `.gitkeep`).

## 7. Decisões e combinados da equipe

| Decisão | Situação |
|---|---|
| Stack A (Spring Boot + React + React Native + PostgreSQL) | Definido |
| TypeScript no web e no mobile | Definido (conforme enunciado) |
| Código na raiz; `releases/` só com documentação | Definido |
| Arquitetura em camadas, organizada por funcionalidade | Sugestão, a confirmar |
| Prefixo `/api` nos endpoints | A combinar com o backend |
| Nome da pasta do React (`web` ou `frontend`) | A decidir |
| Biblioteca visual (Material UI, Ant Design, Tailwind...) | A decidir com os devs web |
| Autenticação por sessão ou JWT | A decidir (arquitetura) |
| Uso de DTOs | A decidir (arquitetura) |

## 8. Pendências para a base ficar pronta

- [ ] `application.yml` criado (depende do banco no ar)
- [ ] `docker-compose.yml` entregue pelo DevOps (T-07)
- [ ] `.gitignore` na raiz (`.env`, arquivos de IDE, builds)
- [ ] README principal com links para as três releases
- [ ] Springdoc e JaCoCo no `pom.xml`
- [ ] `.gitkeep` nas pastas vazias
- [ ] Commit, push, proteção de branch e convite aos colegas
- [ ] Avisar a equipe dos combinados da seção 7

## 9. Próximos passos

1. Discutir a arquitetura em equipe (camadas, DTOs, autenticação).
2. Funcionalidade-modelo no backend (por exemplo `Estudo`) para os demais seguirem o padrão.
3. Distribuição das tasks conforme o [[sprint-1]].
