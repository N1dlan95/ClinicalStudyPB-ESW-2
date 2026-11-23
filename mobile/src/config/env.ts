/**
 * Configuração de ambiente do app.
 *
 * EXPO_PUBLIC_API_URL: URL base da API REST (backend Spring Boot).
 *   Padrão: http://10.0.2.2:8080, o localhost da máquina vista de dentro do emulador Android.
 *   Em celular físico, use o IP do computador na rede (ex.: http://192.168.0.10:8080).
 * EXPO_PUBLIC_USE_MOCK=true: liga o modo simulado (dados fictícios em memória),
 *   para demonstrar as telas sem o backend rodando.
 *
 * As variáveis precisam ser lidas pelo nome completo: o Expo troca process.env.EXPO_PUBLIC_*
 * pelo valor na hora de montar o app.
 */
const API_URL_PADRAO = 'http://10.0.2.2:8080';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || API_URL_PADRAO).replace(/\/+$/, '');

export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
