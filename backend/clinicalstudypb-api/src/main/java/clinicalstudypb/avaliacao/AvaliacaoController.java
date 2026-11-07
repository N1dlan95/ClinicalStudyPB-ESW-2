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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF09: avaliação dos critérios de elegibilidade de um candidato
@RestController
@RequestMapping("/candidatos/{candidatoId}/avaliacao")
@Tag(name = "Avaliações", description = "Avaliação da elegibilidade de candidatos")
public class AvaliacaoController {

	private final AvaliacaoService servico;

	public AvaliacaoController(AvaliacaoService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Consulta uma avaliação", description = "Retorna a avaliação de elegibilidade do candidato.")
	public AvaliacaoResponse consultar(@PathVariable Long candidatoId) {
		return servico.consultar(candidatoId);
	}

	// PUT porque registrar de novo substitui a avaliação anterior
	@PutMapping
	@Operation(summary = "Registra uma avaliação", description = "Registra ou substitui a avaliação de elegibilidade do candidato.")
	public AvaliacaoResponse avaliar(@PathVariable Long candidatoId, @RequestBody @Valid AvaliacaoRequest dados,
			@AuthenticationPrincipal Jwt token) {
		return servico.avaliar(candidatoId, dados, Long.valueOf(token.getSubject()));
	}

}
