import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../features/auth/AuthContext';
import { VisitasView } from '../../features/participante/VisitasView';
import { participanteService } from '../../features/participante/participanteService';
import { telaStyles } from '../../theme/telaStyles';

export default function VisitasScreen() {
  const { sessao } = useAuth();
  if (!sessao) return null;
  return (
    <SafeAreaView style={telaStyles.tela} edges={['top']}>
      <VisitasView servico={participanteService} token={sessao.token} />
    </SafeAreaView>
  );
}
