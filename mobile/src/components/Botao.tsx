import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type Variante = 'primario' | 'secundario' | 'perigo' | 'perigoSolido' | 'neutro';

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  carregando?: boolean;
  desabilitado?: boolean;
  flex?: boolean;
}

const cores: Record<Variante, { fundo: string; borda: string; texto: string }> = {
  primario: { fundo: colors.primary, borda: colors.primary, texto: '#FFFFFF' },
  secundario: { fundo: colors.surface, borda: colors.primary, texto: colors.primary },
  perigo: { fundo: colors.surface, borda: colors.warning, texto: colors.warning },
  perigoSolido: { fundo: colors.warning, borda: colors.warning, texto: '#FFFFFF' },
  neutro: { fundo: colors.surface, borda: colors.border, texto: colors.text },
};

export function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado, flex }: BotaoProps) {
  const inativo = desabilitado || carregando;
  const cor = cores[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      style={({ pressed }) => [
        styles.botao,
        { backgroundColor: cor.fundo, borderColor: cor.borda },
        flex && styles.flex,
        inativo && styles.inativo,
        pressed && styles.pressionado,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={cor.texto} />
      ) : (
        <Text style={[styles.texto, { color: cor.texto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  flex: { flex: 1 },
  inativo: { opacity: 0.6 },
  pressionado: { opacity: 0.85 },
  texto: { fontSize: 15, fontWeight: '600' },
});
