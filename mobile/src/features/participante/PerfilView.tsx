import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../../components/Botao';
import { Cabecalho } from '../../components/Cabecalho';
import { Card } from '../../components/Card';
import { Carregando, ErroCarregamento } from '../../components/EstadoTela';
import { colors } from '../../theme/colors';
import type { Usuario } from '../auth/types';
import type { ParticipanteService } from './participanteService';
import type { EstudoParticipante } from './types';
import { useCarregamento } from './useCarregamento';

interface Props {
  servico: ParticipanteService;
  token: string;
  usuario: Usuario;
  onSair: () => void;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** Dados do participante, RF20 (retirada voluntária) e RF02 (sair). */
export function PerfilView({ servico, token, usuario, onSair }: Props) {
  const buscar = useCallback(() => servico.listarEstudos(token), [servico, token]);
  const { dados, setDados, erro, carregando, recarregar } = useCarregamento(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />;

  const ativos = (dados ?? []).filter((e) => e.status !== 'ENCERRADO');

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <Cabecalho titulo="Perfil" />
      <View style={styles.corpo}>
        <Card>
          <View style={styles.usuario}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciais(usuario.nome)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.nome}>{usuario.nome}</Text>
              <Text style={styles.muted}>{usuario.email}</Text>
            </View>
          </View>
        </Card>

        {ativos.map((estudo) => (
          <CardRetirada
            key={estudo.id}
            estudo={estudo}
            onSolicitar={async () => {
              const atualizado = await servico.solicitarRetirada(token, estudo.id);
              setDados((atual) => (atual ?? []).map((e) => (e.id === atualizado.id ? atualizado : e)));
            }}
          />
        ))}

        <View style={styles.sair}>
          <Botao titulo="Sair" variante="secundario" onPress={onSair} />
        </View>
      </View>
    </ScrollView>
  );
}

function CardRetirada({ estudo, onSolicitar }: { estudo: EstudoParticipante; onSolicitar: () => Promise<void> }) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await onSolicitar();
      setConfirmando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <Text style={styles.secao}>Participação</Text>
      <Text style={styles.muted}>
        Você está incluído no {estudo.titulo}. A retirada é voluntária e pode ser solicitada a qualquer momento.
      </Text>
      {erro && (
        <Text style={styles.erro} accessibilityRole="alert">
          {erro}
        </Text>
      )}
      {estudo.retiradaSolicitada ? (
        <Text style={styles.sucesso} accessibilityRole="text">
          Solicitação de retirada enviada à coordenação.
        </Text>
      ) : confirmando ? (
        <View style={styles.confirmacao}>
          <Text style={styles.confirmacaoTexto}>
            Confirma a solicitação de retirada? A coordenação do estudo será avisada.
          </Text>
          <View style={styles.linha}>
            <Botao titulo="Cancelar" variante="neutro" onPress={() => setConfirmando(false)} desabilitado={enviando} flex />
            <Botao titulo="Confirmar retirada" variante="perigoSolido" onPress={confirmar} carregando={enviando} flex />
          </View>
        </View>
      ) : (
        <Botao titulo="Solicitar retirada do estudo" variante="perigo" onPress={() => setConfirmando(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  conteudo: { flexGrow: 1, paddingBottom: 20 },
  corpo: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 18, fontWeight: '700', color: colors.primary },
  flex: { flex: 1 },
  nome: { fontSize: 17, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  secao: { fontSize: 15, fontWeight: '600', color: colors.text },
  erro: { fontSize: 14, color: colors.error },
  sucesso: { fontSize: 14, fontWeight: '600', color: colors.success, backgroundColor: colors.successBackground, borderRadius: 8, padding: 10 },
  confirmacao: { backgroundColor: colors.warningBackground, borderRadius: 8, padding: 12, gap: 10 },
  confirmacaoTexto: { fontSize: 14, color: colors.warningStrong },
  linha: { flexDirection: 'row', gap: 8 },
  sair: { marginTop: 'auto' },
});
