/**
 * Configuração de ambiente do app.
 *
 * EXPO_PUBLIC_API_URL: URL base da API REST (backend Spring Boot).
 *   Ex.: http://10.0.2.2:8080 no emulador Android (10.0.2.2 = localhost da máquina host).
 * Sem essa variável, o app usa um serviço de autenticação simulado (mock),
 * para que a tela possa ser desenvolvida e demonstrada antes da API ficar pronta.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';

export const USE_MOCK_API = API_URL === '';
