import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Botao } from './Botao';

/** Estados de carregamento e erro compartilhados pelas telas que buscam dados. */
export function Carregando() {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErroCarregamento({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente: () => void }) {
  return (
    <View style={styles.centro}>
      <Text style={styles.erro} accessibilityRole="alert">
        {mensagem}
      </Text>
      <Botao titulo="Tentar novamente" variante="secundario" onPress={onTentarNovamente} />
    </View>
  );
}

export function ListaVazia({ mensagem }: { mensagem: string }) {
  return <Text style={styles.vazio}>{mensagem}</Text>;
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  erro: { color: colors.error, fontSize: 15, textAlign: 'center' },
  vazio: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 24 },
});
