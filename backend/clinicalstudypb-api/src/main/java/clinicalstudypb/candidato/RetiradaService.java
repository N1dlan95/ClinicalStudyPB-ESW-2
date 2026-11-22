package clinicalstudypb.candidato;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.candidato.dto.RetiradaRequest;
import clinicalstudypb.candidato.dto.RetiradaResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visita.VisitaRepository;

// Task 3768 (T-98, RF16): retirada do participante do estudo
@Service
public class RetiradaService {

	static final String MOTIVO_CANCELAMENTO = "Retirada do participante";

	private final CandidatoRepository candidatos;
	private final VisitaRepository visitas;
	private final UsuarioRepository usuarios;

	public RetiradaService(CandidatoRepository candidatos, VisitaRepository visitas, UsuarioRepository usuarios) {
		this.candidatos = candidatos;
		this.visitas = visitas;
		this.usuarios = usuarios;
	}

	// Valida nesta ordem: estudo não encerrado, participante ainda não retirado e participante INCLUIDO.
	// Na mesma transação: status RETIRADO com data, motivo e responsável; as visitas AGENDADA viram CANCELADA
	// (REALIZADA, AUSENTE e CANCELADA não mudam). A vaga fica livre porque a contagem usa só INCLUIDO.
	// A conta continua ativa: o participante segue vendo no app o histórico da participação RETIRADO (RF17).
	@Transactional
	public RetiradaResponse retirar(Long candidatoId, RetiradaRequest dados, Long responsavelId) {
		Candidato participante = candidatos.buscarParaAtualizar(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Participante não encontrado"));
		Estudo estudo = participante.getEstudo();
		if (estudo.isEncerrado()) {
			throw conflito("ESTUDO_ENCERRADO", "Não é possível retirar participantes de um estudo encerrado");
		}
		if (participante.getStatus() == StatusCandidato.RETIRADO) {
			throw conflito("PARTICIPANTE_JA_RETIRADO", "Este participante já foi retirado do estudo");
		}
		if (participante.getStatus() != StatusCandidato.INCLUIDO) {
			throw conflito("PARTICIPANTE_NAO_INCLUIDO", "Só é possível retirar participantes incluídos no estudo");
		}

		Usuario responsavel = responsavel(responsavelId);
		participante.retirar(dados.motivo().trim(), responsavel);
		List<Visita> agendadas = visitas.findByParticipanteIdAndStatus(candidatoId, StatusVisita.AGENDADA);
		agendadas.forEach(visita -> visita.registrarStatus(StatusVisita.CANCELADA, MOTIVO_CANCELAMENTO, responsavel));

		long vagasOcupadas = candidatos.countByEstudoIdAndStatus(estudo.getId(), StatusCandidato.INCLUIDO);
		return new RetiradaResponse(CandidatoResponse.de(participante), agendadas.size(), vagasOcupadas,
				estudo.getLimiteParticipantes());
	}

	private Usuario responsavel(Long responsavelId) {
		return usuarios.findById(responsavelId)
				.orElseThrow(() -> new RegraNegocioException("NAO_AUTENTICADO", "Sessão inválida. Entre novamente",
						HttpStatus.UNAUTHORIZED));
	}

	private static RegraNegocioException conflito(String codigo, String mensagem) {
		return new RegraNegocioException(codigo, mensagem, HttpStatus.CONFLICT);
	}

}
