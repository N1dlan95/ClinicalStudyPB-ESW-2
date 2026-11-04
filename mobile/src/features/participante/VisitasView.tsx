import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../../components/Botao';
import { Cabecalho } from '../../components/Cabecalho';
import { Card } from '../../components/Card';
import { Carregando, ErroCarregamento, ListaVazia } from '../../components/EstadoTela';
import { StatusChip } from '../../components/StatusChip';
import { colors } from '../../theme/colors';
import { formatarDataHora, rotuloStatusVisita } from './formatacao';
import type { ParticipanteService } from './participanteService';
import type { Visita } from './types';
import { useCarregamento } from './useCarregamento';

type Aba = 'proximas' | 'historico';

interface Props {
  servico: ParticipanteService;
  token: string;
}

/** RF18: próximas visitas e histórico de comparecimento. RF19: confirmar presença ou pedir reagendamento. */
export function VisitasView({ servico, token }: Props) {
  const [aba, setAba] = useState<Aba>('proximas');
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const buscar = useCallback(() => servico.listarVisitas(token), [servico, token]);
  const { dados, setDados, erro, carregando, recarregar } = useCarregamento(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />;

  const visitas = dados ?? [];
  const lista =
    aba === 'proximas'
      ? visitas.filter((v) => v.status === 'AGENDADA').sort((a, b) => a.dataHora.localeCompare(b.dataHora))
      : visitas.filter((v) => v.status !== 'AGENDADA').sort((a, b) => b.dataHora.localeCompare(a.dataHora));

  async function executar(visitaId: number, acao: (t: string, id: number) => Promise<Visita>) {
    setAcaoEmAndamento(visitaId);
    setErroAcao(null);
    try {
      const atualizada = await acao(token, visitaId);
      setDados((atual) => (atual ?? []).map((v) => (v.id === atualizada.id ? atualizada : v)));
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Não foi possível concluir a operação.');
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  return (
    <FlatList
      data={lista}
      keyExtractor={(v) => String(v.id)}
      contentContainerStyle={styles.lista}
      onRefresh={recarregar}
      refreshing={carregando}
      ListHeaderComponent={
        <Cabecalho titulo="Visitas">
          <View style={styles.segmento} accessibilityRole="tablist">
            <OpcaoSegmento rotulo="Próximas" ativa={aba === 'proximas'} onPress={() => setAba('proximas')} />
            <OpcaoSegmento rotulo="Histórico" ativa={aba === 'historico'} onPress={() => setAba('historico')} />
          </View>
          {erroAcao && (
            <Text style={styles.erro} accessibilityRole="alert">
              {erroAcao}
            </Text>
          )}
        </Cabecalho>
      }
      ListEmptyComponent={
        <ListaVazia mensagem={aba === 'proximas' ? 'Nenhuma visita agendada.' : 'Nenhuma visita no histórico.'} />
      }
      renderItem={({ item }) =>
        aba === 'proximas' ? (
          <CardProximaVisita
            visita={item}
            ocupado={acaoEmAndamento === item.id}
            onConfirmar={() => executar(item.id, servico.confirmarPresenca)}
            onReagendar={() => executar(item.id, servico.solicitarReagendamento)}
          />
        ) : (
          <ItemHistorico visita={item} />
        )
      }
    />
  );
}

function OpcaoSegmento({ rotulo, ativa, onPress }: { rotulo: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativa }}
      style={[styles.opcao, ativa && styles.opcaoAtiva]}
    >
      <Text style={[styles.opcaoTexto, ativa && styles.opcaoTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

function CardProximaVisita({
  visita,
  ocupado,
  onConfirmar,
  onReagendar,
}: {
  visita: Visita;
  ocupado: boolean;
  onConfirmar: () => void;
  onReagendar: () => void;
}) {
  return (
    <View style={styles.item}>
      <Card>
        <Text style={styles.muted12}>{visita.estudoTitulo}</Text>
        <Text style={styles.titulo}>{visita.nome}</Text>
        <Text style={styles.texto}>{formatarDataHora(visita.dataHora)}</Text>
        <Text style={styles.muted}>{visita.local}</Text>
        {visita.presencaConfirmada && <Text style={[styles.aviso, styles.avisoSucesso]}>Presença confirmada</Text>}
        {visita.reagendamentoSolicitado && (
          <Text style={[styles.aviso, styles.avisoAlerta]}>Reagendamento solicitado. A coordenação entrará em contato.</Text>
        )}
        <View style={styles.acoes}>
          {!visita.presencaConfirmada && (
            <Botao titulo="Confirmar presença" onPress={onConfirmar} carregando={ocupado} />
          )}
          {!visita.reagendamentoSolicitado && (
            <Botao titulo="Solicitar reagendamento" variante="secundario" onPress={onReagendar} desabilitado={ocupado} />
          )}
        </View>
      </Card>
    </View>
  );
}

function ItemHistorico({ visita }: { visita: Visita }) {
  const status = rotuloStatusVisita[visita.status];
  return (
    <View style={styles.item}>
      <Card>
        <View style={styles.linha}>
          <View style={styles.flex}>
            <Text style={styles.tituloMenor}>{visita.nome}</Text>
            <Text style={styles.muted}>{formatarDataHora(visita.dataHora)}</Text>
            <Text style={styles.muted12}>{visita.estudoTitulo}</Text>
          </View>
          <StatusChip texto={status.texto} tipo={status.tipo} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: 20 },
  item: { paddingHorizontal: 20, paddingTop: 12 },
  segmento: { flexDirection: 'row', backgroundColor: colors.divider, borderRadius: 10, padding: 4, gap: 4, marginTop: 12 },
  opcao: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  opcaoAtiva: { backgroundColor: colors.surface },
  opcaoTexto: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  opcaoTextoAtivo: { color: colors.text },
  erro: { color: colors.error, fontSize: 14, marginTop: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  titulo: { fontSize: 17, fontWeight: '600', color: colors.text },
  tituloMenor: { fontSize: 15, fontWeight: '600', color: colors.text },
  texto: { fontSize: 14, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  muted12: { fontSize: 12, color: colors.textMuted },
  aviso: { fontSize: 14, fontWeight: '600', borderRadius: 8, padding: 10 },
  avisoSucesso: { color: colors.success, backgroundColor: colors.successBackground },
  avisoAlerta: { color: colors.warning, backgroundColor: colors.warningBackground },
  acoes: { gap: 8, marginTop: 4 },
});
