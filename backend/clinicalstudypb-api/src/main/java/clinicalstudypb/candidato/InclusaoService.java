package clinicalstudypb.candidato;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.dto.InclusaoResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;

// RF11: inclusão de candidatos elegíveis, com consentimento e respeitando o limite de vagas
@Service
public class InclusaoService {

	private final CandidatoRepository candidatos;
	private final EstudoRepository estudos;

	public InclusaoService(CandidatoRepository candidatos, EstudoRepository estudos) {
		this.candidatos = candidatos;
		this.estudos = estudos;
	}

	// Valida nesta ordem: estudo em recrutamento, candidato elegível, consentimento e vaga disponível.
	// Candidato e estudo ficam travados até o fim da transação, para a última vaga não ser ocupada duas vezes.
	@Transactional
	public InclusaoResponse incluir(Long candidatoId) {
		Candidato candidato = candidatos.buscarParaAtualizar(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
		Long estudoId = candidato.getEstudo().getId();
		Estudo estudo = estudos.buscarParaAtualizar(estudoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Estudo não encontrado"));

		if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO) {
			throw conflito("ESTUDO_FORA_DE_RECRUTAMENTO", "Só é possível incluir candidatos com o estudo em recrutamento");
		}
		if (candidato.getStatus() == StatusCandidato.INCLUIDO) {
			throw conflito("CANDIDATO_JA_INCLUIDO", "Este candidato já está incluído no estudo");
		}
		if (candidato.getStatus() != StatusCandidato.ELEGIVEL) {
			throw conflito("CANDIDATO_NAO_ELEGIVEL", "Só é possível incluir candidatos avaliados como elegíveis");
		}
		if (!candidato.isConsentimentoRegistrado()) {
			throw conflito("CONSENTIMENTO_NAO_REGISTRADO", "Registre o consentimento do candidato antes de incluir");
		}
		long vagasOcupadas = candidatos.countByEstudoIdAndStatus(estudoId, StatusCandidato.INCLUIDO);
		if (vagasOcupadas >= estudo.getLimiteParticipantes()) {
			throw conflito("VAGAS_ESGOTADAS", "Todas as vagas do estudo estão ocupadas");
		}

		candidato.incluir();
		return new InclusaoResponse(vagasOcupadas + 1, estudo.getLimiteParticipantes());
	}

	private static RegraNegocioException conflito(String codigo, String mensagem) {
		return new RegraNegocioException(codigo, mensagem, HttpStatus.CONFLICT);
	}

}
