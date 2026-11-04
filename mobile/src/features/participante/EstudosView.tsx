import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cabecalho } from '../../components/Cabecalho';
import { Card } from '../../components/Card';
import { Carregando, ErroCarregamento, ListaVazia } from '../../components/EstadoTela';
import { StatusChip } from '../../components/StatusChip';
import { colors } from '../../theme/colors';
import { formatarData, formatarDataHora, rotuloStatusEstudo } from './formatacao';
import type { ParticipanteService } from './participanteService';
import type { EstudoParticipante, Visita } from './types';
import { useCarregamento } from './useCarregamento';

interface Props {
  servico: ParticipanteService;
  token: string;
  nomeUsuario: string;
  onVerVisitas: () => void;
}

/** RF17: estudos em que o participante está incluído, com a próxima visita de cada um. */
export function EstudosView({ servico, token, nomeUsuario, onVerVisitas }: Props) {
  const buscar = useCallback(
    () => Promise.all([servico.listarEstudos(token), servico.listarVisitas(token)]),
    [servico, token],
  );
  const { dados, erro, carregando, recarregar } = useCarregamento(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />;

  const [estudos, visitas] = dados ?? [[], []];
  const proximaVisita = (estudoId: number): Visita | undefined =>
    visitas
      .filter((v) => v.estudoId === estudoId && v.status === 'AGENDADA')
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0];

  return (
    <FlatList
      data={estudos}
      keyExtractor={(e) => String(e.id)}
      ListHeaderComponent={<Cabecalho titulo="Meus estudos" subtitulo={`Olá, ${nomeUsuario}`} />}
      ListEmptyComponent={<ListaVazia mensagem="Você ainda não está incluído em nenhum estudo." />}
      contentContainerStyle={styles.lista}
      onRefresh={recarregar}
      refreshing={carregando}
      renderItem={({ item }) => <CardEstudo estudo={item} proxima={proximaVisita(item.id)} onVerVisitas={onVerVisitas} />}
    />
  );
}

function CardEstudo({ estudo, proxima, onVerVisitas }: { estudo: EstudoParticipante; proxima?: Visita; onVerVisitas: () => void }) {
  const status = rotuloStatusEstudo[estudo.status];
  const encerrado = estudo.status === 'ENCERRADO';
  return (
    <View style={styles.item}>
      <Card>
        <View style={styles.linha}>
          <StatusChip texto={status.texto} tipo={status.tipo} />
          <Text style={styles.periodo}>
            {encerrado ? `Até ${formatarData(estudo.dataFim)}` : `Desde ${formatarData(estudo.dataInicio)}`}
          </Text>
        </View>
        <Text style={styles.titulo}>{estudo.titulo}</Text>
        <Text style={styles.muted}>Responsável: {estudo.responsavel}</Text>
        {estudo.retiradaSolicitada && <StatusChip texto="Retirada solicitada" tipo="alerta" />}
        {proxima && (
          <View style={styles.proxima}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View>
              <Text style={styles.proximaRotulo}>Próxima visita</Text>
              <Text style={styles.proximaTexto}>
                {formatarDataHora(proxima.dataHora)} · {proxima.nome.split(' · ')[0]}
              </Text>
            </View>
          </View>
        )}
        <Pressable onPress={onVerVisitas} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkTexto}>{encerrado ? 'Ver histórico' : 'Ver visitas'}</Text>
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
  proxima: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, padding: 12 },
  proximaRotulo: { fontSize: 12, color: colors.textMuted },
  proximaTexto: { fontSize: 14, fontWeight: '600', color: colors.text },
  link: { minHeight: 44, justifyContent: 'center' },
  linkTexto: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
