# ClinicalStudyPB — Aplicativo do participante (mobile)

Stack A: **React Native + Expo** (SDK 58), **TypeScript**, navegação com **Expo Router**, testes com **Jest** (`jest-expo`) e **React Native Testing Library**.

## Pré-requisitos

- Node.js 20 ou superior
- App **Expo Go** no celular, ou emulador Android (Android Studio) / simulador iOS (Xcode, só no macOS)

## Como executar

```bash
cd mobile
npm install
npx expo start
```

Depois, leia o QR code com o Expo Go ou pressione `a` (Android) / `i` (iOS) no terminal.

### API real x modo demonstração

Por padrão, o app usa a API real em `http://10.0.2.2:8080`, que é o `localhost` da máquina visto de dentro do emulador Android. Suba o backend antes (`docker compose up` na raiz do repositório) e entre com a conta de participante da seed:

| Perfil | E-mail | Senha | Resultado |
|---|---|---|---|
| Participante | `participante@clinicalstudypb.test` | `Senha@123` | Entra no app |
| Outros perfis (ex.: `pesquisador@clinicalstudypb.test`) | | `Senha@123` | Bloqueado: o app é só para participantes (RF03) |

No celular físico, aponte para o IP da máquina na rede local:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080 npx expo start
```

Para demonstrar as telas sem o backend, ligue o modo simulado:

```bash
EXPO_PUBLIC_USE_MOCK=true npx expo start
```

No modo simulado, entre com `participante@clinicalstudy.pb` / `senha123`.

**Sessão:** o login segue o contrato `POST /api/auth/login` do `openapi.yaml`. O botão Sair chama `POST /api/auth/logout` e apaga a sessão do aparelho mesmo se a chamada falhar. Se qualquer chamada receber 401 (token vencido ou encerrado), o app limpa a sessão e volta ao login com o aviso "Sua sessão expirou. Entre novamente.".

## Testes

```bash
npm test          # Jest + Testing Library
npm run typecheck # verificação de tipos
```

## Telas

| Tela | Requisitos | O que faz |
|---|---|---|
| Login | RF02, RF03 | Valida e-mail e senha, mostra erros, bloqueia perfis que não são participante |
| Estudos | RF17 | Estudos em que o participante está incluído, com status e próxima visita |
| Visitas | RF18, RF19 | Próximas visitas (confirmar presença, pedir reagendamento) e histórico de comparecimento |
| Perfil | RF20, RF02 | Dados do participante, pedido de retirada com confirmação, sair |

Com `EXPO_PUBLIC_USE_MOCK=true`, as telas usam dados fictícios em memória. Os endpoints do participante (estudos, visitas, retirada) ainda não existem no backend; eles estão documentados em `src/features/participante/participanteService.ts`.

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
  components/                 # Botao, Card, StatusChip, Cabecalho, estados de carregamento/erro
  features/auth/              # login, sessão (expo-secure-store), validação
  features/participante/      # telas do participante, serviço (API/mock) e testes
  config/env.ts               # EXPO_PUBLIC_API_URL
  theme/                      # cores e estilos compartilhados
```
