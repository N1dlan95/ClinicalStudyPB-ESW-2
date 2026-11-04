import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Carregando } from '../../components/EstadoTela';
import { useAuth } from '../../features/auth/AuthContext';
import { colors } from '../../theme/colors';

type NomeIcone = ComponentProps<typeof Ionicons>['name'];

function icone(ativo: NomeIcone, inativo: NomeIcone) {
  return ({ focused, size }: { focused: boolean; size: number }) => (
    <Ionicons name={focused ? ativo : inativo} size={size} color={focused ? colors.primary : colors.textMuted} />
  );
}

/** Navegação base do participante: só abre com sessão ativa (RF02/RF03). */
export default function AppLayout() {
  const { sessao, carregando } = useAuth();

  if (carregando) return <Carregando />;
  if (!sessao) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.divider },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Estudos', tabBarIcon: icone('flask', 'flask-outline') }} />
      <Tabs.Screen name="visitas" options={{ title: 'Visitas', tabBarIcon: icone('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icone('person', 'person-outline') }} />
    </Tabs>
  );
}
