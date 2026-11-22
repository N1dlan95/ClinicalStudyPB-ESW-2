package clinicalstudypb.candidato;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.candidato.dto.RetiradaRequest;
import clinicalstudypb.candidato.dto.RetiradaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

// RF16: retirada do participante. Perfil no SecurityConfig: /candidatos/** somente coordenador
@RestController
@Tag(name = "Retirada", description = "Retirada do participante do estudo")
public class RetiradaController {

	private final RetiradaService servico;

	public RetiradaController(RetiradaService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/retirada")
	@Operation(summary = "Retira o participante do estudo (RF16)",
			description = "Cancela as visitas agendadas e libera a vaga. O motivo é obrigatório.")
	public RetiradaResponse retirar(@PathVariable Long candidatoId, @Valid @RequestBody RetiradaRequest dados,
			@AuthenticationPrincipal Jwt token) {
		return servico.retirar(candidatoId, dados, Long.valueOf(token.getSubject()));
	}

}
