import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Sessao } from './types';

const CHAVE_SESSAO = 'clinicalstudypb.sessao';

// expo-secure-store só existe em Android/iOS. Na web (usada apenas para
// pré-visualização) a sessão fica em memória e some ao recarregar a página.
const usarMemoria = Platform.OS === 'web';
let sessaoEmMemoria: string | null = null;

export async function salvarSessao(sessao: Sessao): Promise<void> {
  const valor = JSON.stringify(sessao);
  if (usarMemoria) {
    sessaoEmMemoria = valor;
    return;
  }
  await SecureStore.setItemAsync(CHAVE_SESSAO, valor);
}

export async function carregarSessao(): Promise<Sessao | null> {
  const valor = usarMemoria ? sessaoEmMemoria : await SecureStore.getItemAsync(CHAVE_SESSAO);
  return valor ? (JSON.parse(valor) as Sessao) : null;
}

export async function apagarSessao(): Promise<void> {
  if (usarMemoria) {
    sessaoEmMemoria = null;
    return;
  }
  await SecureStore.deleteItemAsync(CHAVE_SESSAO);
}
