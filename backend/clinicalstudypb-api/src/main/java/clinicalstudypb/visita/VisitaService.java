package clinicalstudypb.visita;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.dto.VisitaReagendamentoRequest;
import clinicalstudypb.visita.dto.VisitaRequest;
import clinicalstudypb.visita.dto.VisitaResponse;
import clinicalstudypb.visitaprevista.VisitaPrevista;
import clinicalstudypb.visitaprevista.VisitaPrevistaRepository;

// Task 3755 (T-88, RF12): agendar e reagendar visitas de participantes incluídos.
@Service
public class VisitaService {

	private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private final VisitaRepository visitas;
	private final CandidatoRepository candidatos;
	private final VisitaPrevistaRepository visitasPrevistas;
	private final EstudoRepository estudos;
	private final UsuarioRepository usuarios;

	public VisitaService(VisitaRepository visitas, CandidatoRepository candidatos,
			VisitaPrevistaRepository visitasPrevistas, EstudoRepository estudos, UsuarioRepository usuarios) {
		this.visitas = visitas;
		this.candidatos = candidatos;
		this.visitasPrevistas = visitasPrevistas;
		this.estudos = estudos;
		this.usuarios = usuarios;
	}

	// ---- RF12: agendamento

	// Valida nesta ordem: participante incluído, estudo não encerrado, visita prevista do mesmo estudo,
	// data dentro da janela e nenhum outro agendamento ativo da mesma visita prevista.
	// O participante fica travado até o fim da transação, para o mesmo agendamento não entrar duas vezes.
	@Transactional
	public VisitaResponse agendar(Long candidatoId, VisitaRequest dados, Long responsavelId) {
		Candidato participante = candidatos.buscarParaAtualizar(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Participante não encontrado"));
		validarParticipanteIncluido(participante);
		validarEstudoAberto(participante.getEstudo());
		VisitaPrevista prevista = visitasPrevistas
				.findByIdAndEstudoId(dados.visitaPrevistaId(), participante.getEstudo().getId())
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita prevista não encontrada neste estudo"));
		validarJanela(participante, prevista, dados.dataHora());
		if (visitas.existsByParticipanteIdAndVisitaPrevistaIdAndStatusNot(candidatoId, prevista.getId(),
				StatusVisita.CANCELADA)) {
			throw conflito("VISITA_JA_AGENDADA",
					"Esta visita prevista já está agendada para o participante. Reagende ou cancele a existente");
		}
		Visita visita = new Visita(participante, prevista, dados.dataHora(), normalizar(dados.local()),
				responsavel(responsavelId));
		return VisitaResponse.de(visitas.save(visita));
	}

	@Transactional
	public VisitaResponse reagendar(Long visitaId, VisitaReagendamentoRequest dados) {
		Visita visita = buscarParaAtualizar(visitaId);
		if (visita.getStatus() != StatusVisita.AGENDADA) {
			throw conflito("VISITA_JA_FINALIZADA", "Só é possível reagendar visitas com status AGENDADA");
		}
		Candidato participante = visita.getParticipante();
		validarParticipanteIncluido(participante);
		validarEstudoAberto(participante.getEstudo());
		validarJanela(participante, visita.getVisitaPrevista(), dados.dataHora());
		visita.reagendar(dados.dataHora(), normalizar(dados.local()));
		return VisitaResponse.de(visita);
	}

	// ---- Consultas

	@Transactional(readOnly = true)
	public List<VisitaResponse> listarDoParticipante(Long candidatoId) {
		if (!candidatos.existsById(candidatoId)) {
			throw new RecursoNaoEncontradoException("Participante não encontrado");
		}
		return visitas.findByParticipanteIdOrderByDataHoraAsc(candidatoId).stream().map(VisitaResponse::de).toList();
	}

	// Agenda do estudo (web, task 3756): filtros opcionais de status e período [de, ate)
	@Transactional(readOnly = true)
	public List<VisitaResponse> listarDoEstudo(Long estudoId, StatusVisita status, LocalDateTime de,
			LocalDateTime ate) {
		if (!estudos.existsById(estudoId)) {
			throw new RecursoNaoEncontradoException("Estudo não encontrado");
		}
		if (de != null && ate != null && !ate.isAfter(de)) {
			throw new ValidacaoException("ate", "O fim do período deve ser depois do início");
		}
		return visitas.buscarDoEstudo(estudoId, status, de, ate).stream().map(VisitaResponse::de).toList();
	}

	@Transactional(readOnly = true)
	public VisitaResponse buscar(Long visitaId) {
		return visitas.buscar(visitaId).map(VisitaResponse::de)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita não encontrada"));
	}

	// ---- Regras comuns

	private Visita buscarParaAtualizar(Long visitaId) {
		return visitas.buscarParaAtualizar(visitaId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita não encontrada"));
	}

	private static void validarParticipanteIncluido(Candidato participante) {
		if (participante.getStatus() != StatusCandidato.INCLUIDO) {
			throw conflito("PARTICIPANTE_NAO_INCLUIDO",
					"Só é possível agendar visitas para participantes incluídos no estudo");
		}
	}

	private static void validarEstudoAberto(Estudo estudo) {
		if (estudo.isEncerrado()) {
			throw conflito("ESTUDO_ENCERRADO", "Não é possível alterar visitas de um estudo encerrado");
		}
	}

	private static void validarJanela(Candidato participante, VisitaPrevista prevista, LocalDateTime dataHora) {
		JanelaVisita janela = JanelaVisita.de(participante, prevista);
		if (janela != null && !janela.contem(dataHora.toLocalDate())) {
			throw new ValidacaoException("dataHora", "A visita \"%s\" deve ser entre %s e %s".formatted(
					prevista.getNome(), janela.inicio().format(DATA), janela.fim().format(DATA)));
		}
	}

	private Usuario responsavel(Long responsavelId) {
		return usuarios.findById(responsavelId)
				.orElseThrow(() -> new RegraNegocioException("NAO_AUTENTICADO", "Sessão inválida. Entre novamente",
						HttpStatus.UNAUTHORIZED));
	}

	private static String normalizar(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}

	private static RegraNegocioException conflito(String codigo, String mensagem) {
		return new RegraNegocioException(codigo, mensagem, HttpStatus.CONFLICT);
	}

}
