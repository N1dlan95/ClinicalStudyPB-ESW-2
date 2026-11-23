import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cabecalho } from '../../components/Cabecalho';
import { Card } from '../../components/Card';
import { Carregando, ErroCarregamento, ListaVazia } from '../../components/EstadoTela';
import { StatusChip } from '../../components/StatusChip';
import { colors } from '../../theme/colors';
import { formatarData, formatarDataHora, rotuloParticipacao, rotuloStatusEstudo } from './formatacao';
import type { ParticipanteService } from './participanteService';
import type { EstudoParticipante } from './types';
import { useCarregamento } from './useCarregamento';

interface Props {
  servico: ParticipanteService;
  token: string;
  nomeUsuario: string;
  onVerVisitas: () => void;
}

/** RF17: estudos em que o participante foi incluído, com a próxima visita de cada um. */
export function EstudosView({ servico, token, nomeUsuario, onVerVisitas }: Props) {
  const buscar = useCallback(() => servico.listarEstudos(token), [servico, token]);
  const { dados, erro, carregando, recarregar } = useCarregamento(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />;

  return (
    <FlatList
      data={dados ?? []}
      keyExtractor={(e) => String(e.candidatoId)}
      ListHeaderComponent={<Cabecalho titulo="Meus estudos" subtitulo={`Olá, ${nomeUsuario}`} />}
      ListEmptyComponent={<ListaVazia mensagem="Você ainda não participa de nenhum estudo." />}
      contentContainerStyle={styles.lista}
      onRefresh={recarregar}
      refreshing={carregando}
      renderItem={({ item }) => <CardEstudo estudo={item} onVerVisitas={onVerVisitas} />}
    />
  );
}

function CardEstudo({ estudo, onVerVisitas }: { estudo: EstudoParticipante; onVerVisitas: () => void }) {
  const participacao = rotuloParticipacao[estudo.participacao];
  const retirado = estudo.participacao === 'RETIRADO';
  const periodo = retirado && estudo.retiradaEm
    ? `Retirado em ${formatarData(estudo.retiradaEm)}`
    : `Desde ${formatarData(estudo.dataInclusao)}`;
  return (
    <View style={styles.item}>
      <Card>
        <View style={styles.linha}>
          <StatusChip texto={participacao.texto} tipo={participacao.tipo} />
          <Text style={styles.periodo}>{periodo}</Text>
        </View>
        <Text style={styles.titulo}>{estudo.titulo}</Text>
        <Text style={styles.muted}>Responsável: {estudo.responsavel}</Text>
        <Text style={styles.muted}>Estudo: {rotuloStatusEstudo[estudo.estado].texto}</Text>
        {estudo.proximaVisita && (
          <View style={styles.proxima}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.proximaRotulo}>Próxima visita</Text>
              <Text style={styles.proximaTexto}>
                {formatarDataHora(estudo.proximaVisita.dataHora)} · {estudo.proximaVisita.nome}
              </Text>
            </View>
          </View>
        )}
        <Pressable onPress={onVerVisitas} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkTexto}>{retirado ? 'Ver histórico' : 'Ver visitas'}</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: 20 },
  item: { paddingHorizontal: 20, paddingTop: 12 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodo: { fontSize: 12, color: colors.textMuted },
  titulo: { fontSize: 17, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  flex: { flex: 1 },
  proxima: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, padding: 12 },
  proximaRotulo: { fontSize: 12, color: colors.textMuted },
  proximaTexto: { fontSize: 14, fontWeight: '600', color: colors.text },
  link: { minHeight: 44, justifyContent: 'center' },
  linkTexto: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
