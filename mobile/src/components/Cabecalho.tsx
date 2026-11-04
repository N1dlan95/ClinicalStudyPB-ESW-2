import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function Cabecalho({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <View style={styles.cabecalho}>
      {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
      <Text style={styles.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, gap: 4 },
  subtitulo: { fontSize: 14, color: colors.textMuted },
  titulo: { fontSize: 24, fontWeight: '700', color: colors.text },
});
