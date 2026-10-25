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

### Modo demonstração x API real

Sem configuração, o login usa um serviço simulado (não precisa do backend):

| Perfil | E-mail | Senha | Resultado |
|---|---|---|---|
| Participante | `participante@clinicalstudy.pb` | `senha123` | Entra no app |
| Pesquisador | `pesquisador@clinicalstudy.pb` | `senha123` | Bloqueado (app é só para participantes, RF03) |

Para usar o backend Spring Boot, defina a URL da API antes de iniciar:

```bash
# Emulador Android: 10.0.2.2 aponta para o localhost da máquina
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo start
```

No celular físico, use o IP da máquina na rede local (ex.: `http://192.168.0.10:8080`).

> O contrato de login (`POST /api/auth/login` com `{ email, senha }` → `{ token, usuario }`) é **provisório** até a equipe publicar o OpenAPI. Ele está isolado em `src/features/auth/authService.ts`.

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

Sem `EXPO_PUBLIC_API_URL`, as telas usam dados fictícios em memória. Os endpoints provisórios estão documentados em `src/features/participante/participanteService.ts`.

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
