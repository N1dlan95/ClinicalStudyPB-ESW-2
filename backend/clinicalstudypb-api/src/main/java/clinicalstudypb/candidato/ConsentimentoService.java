package clinicalstudypb.candidato;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// RF10: registro do consentimento simulado do candidato
@Service
public class ConsentimentoService {

	private final CandidatoRepository candidatos;
	private final UsuarioRepository usuarios;

	public ConsentimentoService(CandidatoRepository candidatos, UsuarioRepository usuarios) {
		this.candidatos = candidatos;
		this.usuarios = usuarios;
	}

	// Só para candidato elegível e uma única vez; grava quem registrou e quando.
	// O candidato fica travado até o fim da transação, para dois registros simultâneos não passarem juntos.
	@Transactional
	public CandidatoResponse registrar(Long candidatoId, Long responsavelId) {
		Candidato candidato = candidatos.buscarParaAtualizar(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
		if (candidato.getEstudo().isEncerrado()) {
			throw new RegraNegocioException("ESTUDO_ENCERRADO",
					"Não é possível registrar consentimento em um estudo encerrado", HttpStatus.CONFLICT);
		}
		if (candidato.isConsentimentoRegistrado()) {
			throw new RegraNegocioException("CONSENTIMENTO_JA_REGISTRADO",
					"O consentimento deste candidato já foi registrado", HttpStatus.CONFLICT);
		}
		if (candidato.getStatus() != StatusCandidato.ELEGIVEL) {
			throw new RegraNegocioException("CANDIDATO_NAO_ELEGIVEL",
					"Só é possível registrar o consentimento de candidatos elegíveis", HttpStatus.CONFLICT);
		}
		Usuario responsavel = usuarios.findById(responsavelId)
				.orElseThrow(() -> new RegraNegocioException("NAO_AUTENTICADO", "Sessão inválida. Entre novamente",
						HttpStatus.UNAUTHORIZED));
		candidato.registrarConsentimento(responsavel);
		return CandidatoResponse.de(candidato);
	}

}
