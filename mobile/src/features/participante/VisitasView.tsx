import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Botao } from '../../components/Botao';
import { Cabecalho } from '../../components/Cabecalho';
import { Card } from '../../components/Card';
import { Carregando, ErroCarregamento, ListaVazia } from '../../components/EstadoTela';
import { StatusChip } from '../../components/StatusChip';
import { FUNCIONALIDADES } from '../../config/funcionalidades';
import { colors } from '../../theme/colors';
import { formatarDataHora, rotuloStatusVisita } from './formatacao';
import type { ParticipanteService } from './participanteService';
import type { Visita } from './types';
import { useCarregamento } from './useCarregamento';

interface Props {
  servico: ParticipanteService;
  token: string;
}

interface Secao {
  titulo: string;
  vazio: string;
  data: Visita[];
}

/**
 * RF18: próximas visitas e histórico de comparecimento, na mesma tela.
 * RF19 (confirmar presença e pedir reagendamento) fica desligado até a Sprint 4: config/funcionalidades.ts.
 */
export function VisitasView({ servico, token }: Props) {
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const buscar = useCallback(() => servico.listarVisitas(token), [servico, token]);
  const { dados, setDados, erro, carregando, recarregar } = useCarregamento(buscar);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />;

  const visitas = dados ?? [];
  const secoes: Secao[] = [
    {
      titulo: 'Próximas visitas',
      vazio: 'Nenhuma visita agendada.',
      data: visitas.filter((v) => v.status === 'AGENDADA').sort((a, b) => a.dataHora.localeCompare(b.dataHora)),
    },
    {
      titulo: 'Histórico de comparecimento',
      vazio: 'Nenhuma visita no histórico.',
      data: visitas.filter((v) => v.status !== 'AGENDADA').sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
    },
  ];

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
    <SectionList
      sections={secoes}
      keyExtractor={(v) => String(v.id)}
      contentContainerStyle={styles.lista}
      onRefresh={recarregar}
      refreshing={carregando}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <Cabecalho titulo="Visitas">
          {erroAcao && (
            <Text style={styles.erro} accessibilityRole="alert">
              {erroAcao}
            </Text>
          )}
        </Cabecalho>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.secao} accessibilityRole="header">
          {section.titulo}
        </Text>
      )}
      renderSectionFooter={({ section }) => (section.data.length === 0 ? <ListaVazia mensagem={section.vazio} /> : null)}
      renderItem={({ item }) => (
        <CardVisita
          visita={item}
          ocupado={acaoEmAndamento === item.id}
          onConfirmar={() => executar(item.id, servico.confirmarPresenca)}
          onReagendar={() => executar(item.id, servico.solicitarReagendamento)}
        />
      )}
    />
  );
}

function CardVisita({
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
  const status = rotuloStatusVisita[visita.status];
  const mostrarAcoes = FUNCIONALIDADES.confirmarPresencaEReagendamento && visita.status === 'AGENDADA';
  return (
    <View style={styles.item}>
      <Card>
        <View style={styles.linha}>
          <View style={styles.flex}>
            <Text style={styles.muted12}>{visita.estudoTitulo}</Text>
            <Text style={styles.titulo}>{visita.nome}</Text>
            <Text style={styles.texto}>{formatarDataHora(visita.dataHora)}</Text>
            {visita.local && <Text style={styles.muted}>{visita.local}</Text>}
          </View>
          <StatusChip texto={status.texto} tipo={status.tipo} />
        </View>
        {mostrarAcoes && (
          <AcoesRf19 visita={visita} ocupado={ocupado} onConfirmar={onConfirmar} onReagendar={onReagendar} />
        )}
      </Card>
    </View>
  );
}

// RF19 (Sprint 4): só aparece com FUNCIONALIDADES.confirmarPresencaEReagendamento ligado
function AcoesRf19({
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
    <>
      {visita.presencaConfirmada && <Text style={[styles.aviso, styles.avisoSucesso]}>Presença confirmada</Text>}
      {visita.reagendamentoSolicitado && (
        <Text style={[styles.aviso, styles.avisoAlerta]}>Reagendamento solicitado. A coordenação entrará em contato.</Text>
      )}
      <View style={styles.acoes}>
        {!visita.presencaConfirmada && <Botao titulo="Confirmar presença" onPress={onConfirmar} carregando={ocupado} />}
        {!visita.reagendamentoSolicitado && (
          <Botao titulo="Solicitar reagendamento" variante="secundario" onPress={onReagendar} desabilitado={ocupado} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: 20 },
  item: { paddingHorizontal: 20, paddingTop: 12 },
  secao: { fontSize: 15, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 20 },
  erro: { color: colors.error, fontSize: 14, marginTop: 8 },
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1, gap: 2 },
  titulo: { fontSize: 16, fontWeight: '600', color: colors.text },
  texto: { fontSize: 14, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  muted12: { fontSize: 12, color: colors.textMuted },
  aviso: { fontSize: 14, fontWeight: '600', borderRadius: 8, padding: 10 },
  avisoSucesso: { color: colors.success, backgroundColor: colors.successBackground },
  avisoAlerta: { color: colors.warning, backgroundColor: colors.warningBackground },
  acoes: { gap: 8, marginTop: 4 },
});
