package clinicalstudypb.candidato;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.candidato.dto.CandidatoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF10: registro do consentimento simulado
@RestController
@Tag(name = "Consentimento", description = "Registro de consentimento dos candidatos")
public class ConsentimentoController {

	private final ConsentimentoService servico;

	public ConsentimentoController(ConsentimentoService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/consentimento")
	@Operation(summary = "Registra o consentimento", description = "Registra o consentimento informado por um candidato.")
	public CandidatoResponse registrar(@PathVariable Long candidatoId, @AuthenticationPrincipal Jwt token) {
		return servico.registrar(candidatoId, Long.valueOf(token.getSubject()));
	}

}
