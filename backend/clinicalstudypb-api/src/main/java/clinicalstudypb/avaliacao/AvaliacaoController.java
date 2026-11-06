package clinicalstudypb.avaliacao;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.avaliacao.dto.AvaliacaoRequest;
import clinicalstudypb.avaliacao.dto.AvaliacaoResponse;
import jakarta.validation.Valid;

// RF09: avaliação dos critérios de elegibilidade de um candidato
@RestController
@RequestMapping("/candidatos/{candidatoId}/avaliacao")
public class AvaliacaoController {

	private final AvaliacaoService servico;

	public AvaliacaoController(AvaliacaoService servico) {
		this.servico = servico;
	}

	@GetMapping
	public AvaliacaoResponse consultar(@PathVariable Long candidatoId) {
		return servico.consultar(candidatoId);
	}

	// PUT porque registrar de novo substitui a avaliação anterior
	@PutMapping
	public AvaliacaoResponse avaliar(@PathVariable Long candidatoId, @RequestBody @Valid AvaliacaoRequest dados,
			@AuthenticationPrincipal Jwt token) {
		return servico.avaliar(candidatoId, dados, Long.valueOf(token.getSubject()));
	}

}
