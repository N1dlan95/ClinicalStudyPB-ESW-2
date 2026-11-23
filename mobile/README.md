# ClinicalStudyPB — Aplicativo do participante (mobile)

Stack A: **React Native + Expo** (SDK 58), **TypeScript**, navegação com **Expo Router**, testes com **Jest** (`jest-expo`) e **React Native Testing Library**.

O app atende só o perfil **participante**: login (RF02, RF03), estudos em que ele foi incluído (RF17) e visitas (RF18).

## Pré-requisitos

| Para | Precisa de |
|---|---|
| Rodar o app | Node.js 20 ou superior |
| Abrir no celular | App **Expo Go** (Android ou iOS), na mesma rede Wi-Fi do computador |
| Abrir no emulador Android | Android Studio com um emulador criado (Device Manager) |
| Abrir no simulador iOS | Xcode (só no macOS) |
| Usar a API real | Docker Desktop, para subir o backend e o banco |

## Passo a passo

### 1. Subir o backend

Na **raiz do repositório**, com o Docker Desktop aberto:

```bash
docker compose up -d --build
```

A API fica em `http://localhost:8080/api`, e as migrações do Flyway criam os dados de demonstração na primeira subida. Para conferir se ela respondeu, abra `http://localhost:8080/api/swagger-ui.html` no navegador.

### 2. Instalar o app

```bash
cd mobile
npm install
```

### 3. Abrir o app apontando para a API

O endereço da API muda conforme onde o app roda, porque `localhost` dentro do emulador ou do celular não é o seu computador:

| Onde o app roda | Endereço da API | Comando (na pasta `mobile`) |
|---|---|---|
| Emulador Android | `http://10.0.2.2:8080` (padrão) | `npx expo start --android` |
| Simulador iOS | `http://localhost:8080` | `EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start --ios` |
| Celular físico (Expo Go) | `http://<IP do computador>:8080` | `EXPO_PUBLIC_API_URL=http://192.168.0.10:8080 npx expo start` |

No celular físico, troque `192.168.0.10` pelo IP do seu computador na rede Wi-Fi: no Windows, rode `ipconfig` e veja o "Endereço IPv4"; no macOS ou Linux, `ipconfig getifaddr en0` ou `hostname -I`. Depois, leia o QR code do terminal com o Expo Go. Se o app não conectar, confira se o celular está na mesma rede e se o firewall do Windows libera a porta 8080.

No PowerShell, a variável é definida antes do comando:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.0.10:8080"; npx expo start
```

> Depois de trocar uma variável `EXPO_PUBLIC_*`, reinicie o Expo com `npx expo start --clear`, porque o valor é gravado no app quando ele é montado.

### 4. Entrar com uma conta de participante

Os dados são fictícios e valem só para o ambiente de desenvolvimento. A senha de todas as contas é `Senha@123`.

| Conta | Participante | O que aparece no app |
|---|---|---|
| `participante@clinicalstudypb.test` | Paula Participante | Incluída: triagem realizada, seguimento e visita final agendados |
| `participante2@clinicalstudypb.test` | Lucas Mendes | Incluído: triagem realizada, ausente no seguimento, visita final agendada |
| `participante3@clinicalstudypb.test` | Beatriz Santos | Incluída: triagem realizada, seguimento cancelado e reagendado |
| `participante4@clinicalstudypb.test` | Otávio Nunes | Retirado do estudo |

As quatro contas ficam no **Estudo de Qualidade do Sono em Adultos**, criado pela migração V14 (task 3750). Sem a V14 na develop, só a conta da Paula existe (V2), e ela entra no app sem nenhum estudo.

Contas da equipe (por exemplo, `pesquisador@clinicalstudypb.test`) **não entram**: o app mostra "Este aplicativo é exclusivo para participantes. Use o sistema web." (RF03).

Um candidato incluído pelo coordenador também ganha uma conta (task 3751): o e-mail é o do candidato, e a senha provisória vem na resposta de `POST /api/candidatos/{id}/inclusao`.

## Modo demonstração (sem backend)

Para mostrar as telas sem subir o backend, ligue o modo simulado com `EXPO_PUBLIC_USE_MOCK`:

```bash
EXPO_PUBLIC_USE_MOCK=true npx expo start
```

No PowerShell:

```powershell
$env:EXPO_PUBLIC_USE_MOCK="true"; npx expo start --clear
```

Nesse modo o app não chama a API: entre com `participante@clinicalstudy.pb` / `senha123`, e as telas mostram dados fictícios em memória. Sem a variável, ou com qualquer valor diferente de `true`, o app usa a API real.

## Sessão

- O login segue o contrato `POST /api/auth/login` do `openapi.yaml`, e o token fica guardado no aparelho com o `expo-secure-store`.
- O botão **Sair** chama `POST /api/auth/logout` e apaga a sessão do aparelho mesmo se a chamada falhar.
- Se qualquer chamada receber 401 (token vencido ou encerrado), o app limpa a sessão e volta ao login com o aviso "Sua sessão expirou. Entre novamente.".

## Testes

Na pasta `mobile`:

```bash
npm test
```

```bash
npm run typecheck
```

O CI do GitHub Actions roda os dois a cada pull request (job **Mobile (testes)**).

## Telas

| Tela | Requisitos | O que faz | API |
|---|---|---|---|
| Login | RF02, RF03 | Valida e-mail e senha, mostra erros e bloqueia perfis que não são participante | `POST /api/auth/login` |
| Estudos | RF17 | Estudos do participante, com responsável, situação da participação e próxima visita | `GET /api/participantes/me/estudos` |
| Visitas | RF18 | Próximas visitas e histórico de comparecimento (realizada ou ausente) | `GET /api/participantes/me/visitas` |
| Perfil | RF02 | Dados do participante e botão Sair | `POST /api/auth/logout` |

**Desligado até a Sprint 4:** confirmar presença e pedir reagendamento (RF19) e o pedido de retirada pelo app (RF20). O código está no app, atrás das chaves de `src/config/funcionalidades.ts`; para ligar, troque o valor para `true` quando as rotas existirem na API.

## Estrutura

```
src/
  app/                        # rotas (Expo Router): cada arquivo é uma tela
    _layout.tsx               # layout raiz + AuthProvider
    login.tsx                 # login do participante
    (app)/_layout.tsx         # abas inferiores; exige sessão ativa
    (app)/index.tsx           # Estudos
    (app)/visitas.tsx         # Visitas
    (app)/perfil.tsx          # Perfil
  components/                 # Botao, Card, StatusChip, Cabecalho, estados de carregamento e erro
  config/env.ts               # EXPO_PUBLIC_API_URL e EXPO_PUBLIC_USE_MOCK
  config/funcionalidades.ts   # RF19 e RF20, desligados até a Sprint 4
  features/auth/              # login, sessão (expo-secure-store), sessão expirada e validação
  features/participante/      # telas do participante, serviço (API ou modo simulado) e testes
  theme/                      # cores e estilos compartilhados
```
