import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../features/auth/AuthContext';
import { colors } from '../theme/colors';

/**
 * Tela inicial provisória do participante. Será substituída pela navegação
 * base (task T-18: adaptar protótipos para mobile — login e navegação).
 */
export default function HomeScreen() {
  const { sessao, carregando, sair } = useAuth();

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sessao) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.titulo}>Olá, {sessao.usuario.nome}</Text>
        <Text style={styles.texto}>Seus estudos e visitas aparecerão aqui.</Text>
        <Pressable style={styles.botao} onPress={sair} accessibilityRole="button">
          <Text style={styles.botaoTexto}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, gap: 12 },
  titulo: { fontSize: 22, fontWeight: '700', color: colors.text },
  texto: { fontSize: 16, color: colors.textMuted },
  botao: {
    marginTop: 'auto',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
