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

## Estrutura

```
src/
  app/                    # rotas (Expo Router): cada arquivo é uma tela
    _layout.tsx           # layout raiz + AuthProvider
    login.tsx             # tela de login do participante (RF02)
    index.tsx             # tela inicial provisória + sair (RF02)
  features/auth/
    LoginForm.tsx         # formulário (validação, erros, carregamento)
    validation.ts         # regras de validação dos campos
    authService.ts        # chamada à API / modo simulado + bloqueio por perfil (RF03)
    AuthContext.tsx       # estado da sessão (entrar/sair)
    sessionStorage.ts     # token salvo com expo-secure-store
    __tests__/            # testes de componente e unidade
  config/env.ts           # EXPO_PUBLIC_API_URL
  theme/colors.ts
```
