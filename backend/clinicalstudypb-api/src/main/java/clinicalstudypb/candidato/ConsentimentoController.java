package clinicalstudypb.candidato;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.candidato.dto.CandidatoResponse;

// RF10: registro do consentimento simulado
@RestController
public class ConsentimentoController {

	private final ConsentimentoService servico;

	public ConsentimentoController(ConsentimentoService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/consentimento")
	public CandidatoResponse registrar(@PathVariable Long candidatoId, @AuthenticationPrincipal Jwt token) {
		return servico.registrar(candidatoId, Long.valueOf(token.getSubject()));
	}

}
