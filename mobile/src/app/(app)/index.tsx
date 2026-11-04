import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthContext';
import { EstudosView } from '../../features/participante/EstudosView';
import { participanteService } from '../../features/participante/participanteService';
import { telaStyles } from '../../theme/telaStyles';

export default function EstudosScreen() {
  const { sessao } = useAuth();
  if (!sessao) return null;
  return (
    <SafeAreaView style={telaStyles.tela} edges={['top']}>
      <EstudosView
        servico={participanteService}
        token={sessao.token}
        nomeUsuario={sessao.usuario.nome}
        onVerVisitas={() => router.navigate('/visitas')}
      />
    </SafeAreaView>
  );
}
