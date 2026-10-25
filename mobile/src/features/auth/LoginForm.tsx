import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { AuthError } from './authService';
import type { Credenciais } from './types';
import { type ErrosLogin, temErros, validarCredenciais } from './validation';

interface LoginFormProps {
  onSubmit: (credenciais: Credenciais) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosLogin>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const senhaRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function handleSubmit() {
    if (enviando) return;
    const credenciais = { email, senha };
    const novosErros = validarCredenciais(credenciais);
    setErros(novosErros);
    setErroGeral(null);
    if (temErros(novosErros)) return;

    setEnviando(true);
    try {
      await onSubmit(credenciais);
    } catch (e) {
      setErroGeral(e instanceof AuthError ? e.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={styles.form}>
      {erroGeral && (
        <View style={styles.alerta} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.alertaTexto}>{erroGeral}</Text>
        </View>
      )}

      <Text style={styles.label} nativeID="label-email">
        E-mail
      </Text>
      <TextInput
        style={[styles.input, erros.email && styles.inputErro]}
        value={email}
        onChangeText={setEmail}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => senhaRef.current?.focus()}
        editable={!enviando}
        accessibilityLabel="E-mail"
        accessibilityLabelledBy="label-email"
      />
      {erros.email && <Text style={styles.erroCampo}>{erros.email}</Text>}

      <Text style={styles.label} nativeID="label-senha">
        Senha
      </Text>
      <TextInput
        ref={senhaRef}
        style={[styles.input, erros.senha && styles.inputErro]}
        value={senha}
        onChangeText={setSenha}
        placeholder="Sua senha"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        editable={!enviando}
        accessibilityLabel="Senha"
        accessibilityLabelledBy="label-senha"
      />
      {erros.senha && <Text style={styles.erroCampo}>{erros.senha}</Text>}

      <Pressable
        style={({ pressed }) => [styles.botao, enviando && styles.botaoDesabilitado, pressed && styles.botaoPressionado]}
        onPress={handleSubmit}
        disabled={enviando}
        accessibilityRole="button"
        accessibilityLabel="Entrar"
        accessibilityState={{ disabled: enviando, busy: enviando }}
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: '100%', gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 10 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputErro: { borderColor: colors.error },
  erroCampo: { color: colors.error, fontSize: 13 },
  alerta: { backgroundColor: colors.errorBackground, borderRadius: 8, padding: 12 },
  alertaTexto: { color: colors.error, fontSize: 14 },
  botao: {
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  botaoDesabilitado: { backgroundColor: colors.primaryDisabled },
  botaoPressionado: { opacity: 0.85 },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
