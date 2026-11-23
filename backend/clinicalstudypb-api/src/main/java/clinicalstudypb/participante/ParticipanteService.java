package clinicalstudypb.participante;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.participante.dto.EstudoDoParticipanteResponse;
import clinicalstudypb.participante.dto.VisitaDoParticipanteResponse;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.VisitaRepository;

// RF17/RF18: dados do app do participante. O usuário vem sempre do token (nunca de um id informado),
// então cada participante só enxerga as próprias participações e visitas.
@Service
public class ParticipanteService {

	// Participações que aparecem no app: quem ainda não foi incluído não é participante
	private static final EnumSet<StatusCandidato> PARTICIPACOES = EnumSet.of(StatusCandidato.INCLUIDO,
			StatusCandidato.RETIRADO);

	// Canceladas ficam de fora: o app mostra as próximas (AGENDADA) e o histórico de comparecimento
	private static final EnumSet<StatusVisita> VISITAS_DO_APP = EnumSet.of(StatusVisita.AGENDADA,
			StatusVisita.REALIZADA, StatusVisita.AUSENTE);

	// Mais recentes primeiro; participação sem data de inclusão (dado antigo) vai para o fim
	private static final Comparator<Candidato> MAIS_RECENTES_PRIMEIRO = Comparator
			.comparing(Candidato::getDataInclusao, Comparator.nullsFirst(Comparator.<LocalDate>naturalOrder()))
			.thenComparing(Candidato::getId)
			.reversed();

	private final CandidatoRepository candidatos;
	private final VisitaRepository visitas;

	public ParticipanteService(CandidatoRepository candidatos, VisitaRepository visitas) {
		this.candidatos = candidatos;
		this.visitas = visitas;
	}

	// RF17 (task 3773): estudos em que o usuário foi incluído, com a próxima visita agendada de cada um
	@Transactional(readOnly = true)
	public List<EstudoDoParticipanteResponse> estudos(Long usuarioId) {
		LocalDateTime agora = LocalDateTime.now();
		return candidatos.findByUsuarioIdAndStatusIn(usuarioId, PARTICIPACOES).stream()
				.sorted(MAIS_RECENTES_PRIMEIRO)
				.map(participacao -> paraResposta(participacao, agora))
				.toList();
	}

	// RF18 (task 3775): visitas de todas as participações do usuário, por data e hora
	@Transactional(readOnly = true)
	public List<VisitaDoParticipanteResponse> visitas(Long usuarioId) {
		return visitas.buscarDaConta(usuarioId, VISITAS_DO_APP).stream()
				.map(VisitaDoParticipanteResponse::de)
				.toList();
	}

	private EstudoDoParticipanteResponse paraResposta(Candidato participacao, LocalDateTime agora) {
		var estudo = participacao.getEstudo();
		var proxima = visitas
				.findFirstByParticipanteIdAndStatusAndDataHoraGreaterThanEqualOrderByDataHoraAsc(participacao.getId(),
						StatusVisita.AGENDADA, agora)
				.map(visita -> new EstudoDoParticipanteResponse.ProximaVisita(visita.getId(),
						visita.getVisitaPrevista().getNome(), visita.getDataHora()))
				.orElse(null);
		return new EstudoDoParticipanteResponse(
				estudo.getId(),
				estudo.getTitulo(),
				estudo.getResponsavel().getNome(),
				estudo.getEstado(),
				estudo.getDataInicio(),
				estudo.getDataFim(),
				participacao.getId(),
				participacao.getStatus(),
				participacao.getDataInclusao(),
				participacao.getRetiradaRegistradaEm(),
				proxima);
	}

}
