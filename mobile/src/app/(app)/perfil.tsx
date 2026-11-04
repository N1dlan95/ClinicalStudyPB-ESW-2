import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthContext';
import { PerfilView } from '../../features/participante/PerfilView';
import { participanteService } from '../../features/participante/participanteService';
import { telaStyles } from '../../theme/telaStyles';

export default function PerfilScreen() {
  const { sessao, sair } = useAuth();
  if (!sessao) return null;
  return (
    <SafeAreaView style={telaStyles.tela} edges={['top']}>
      <PerfilView
        servico={participanteService}
        token={sessao.token}
        usuario={sessao.usuario}
        onSair={async () => {
          await sair();
          router.replace('/login');
        }}
      />
    </SafeAreaView>
  );
}
