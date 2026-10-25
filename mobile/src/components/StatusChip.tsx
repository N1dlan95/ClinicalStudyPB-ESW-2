import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export type TipoStatus = 'sucesso' | 'neutro' | 'alerta' | 'info';

const cores: Record<TipoStatus, { fundo: string; texto: string }> = {
  sucesso: { fundo: colors.successBackground, texto: colors.success },
  neutro: { fundo: colors.neutralBackground, texto: colors.neutral },
  alerta: { fundo: colors.warningBackground, texto: colors.warning },
  info: { fundo: colors.primarySoft, texto: colors.primary },
};

export function StatusChip({ texto, tipo }: { texto: string; tipo: TipoStatus }) {
  return (
    <View style={[styles.chip, { backgroundColor: cores[tipo].fundo }]}>
      <Text style={[styles.texto, { color: cores[tipo].texto }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  texto: { fontSize: 12, fontWeight: '600' },
});
