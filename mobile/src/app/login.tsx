import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { USE_MOCK_API } from '../config/env';
import { useAuth } from '../features/auth/AuthContext';
import { LoginForm } from '../features/auth/LoginForm';
import { colors } from '../theme/colors';

export default function LoginScreen() {
  const { sessao, entrar } = useAuth();

  if (sessao) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.cabecalho}>
            <Text style={styles.titulo} accessibilityRole="header">
              ClinicalStudyPB
            </Text>
            <Text style={styles.subtitulo}>Acesso do participante</Text>
          </View>

          <LoginForm
            onSubmit={async (credenciais) => {
              await entrar(credenciais);
              router.replace('/');
            }}
          />

          {USE_MOCK_API && (
            <Text style={styles.aviso}>Modo demonstração: participante@clinicalstudy.pb / senha123</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  cabecalho: { alignItems: 'center', marginBottom: 24 },
  titulo: { fontSize: 28, fontWeight: '700', color: colors.primary },
  subtitulo: { fontSize: 16, color: colors.textMuted, marginTop: 4 },
  aviso: { marginTop: 24, textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
