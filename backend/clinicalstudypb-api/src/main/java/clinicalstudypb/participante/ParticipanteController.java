package clinicalstudypb.participante;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.participante.dto.EstudoDoParticipanteResponse;
import clinicalstudypb.participante.dto.VisitaDoParticipanteResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF17/RF18: rotas do app do participante. "me" é o usuário do token: nenhum id vem da URL.
@RestController
@RequestMapping("/participantes/me")
@Tag(name = "App do participante", description = "Estudos e visitas do participante logado")
public class ParticipanteController {

	private final ParticipanteService servico;

	public ParticipanteController(ParticipanteService servico) {
		this.servico = servico;
	}

	@GetMapping("/estudos")
	@Operation(summary = "Estudos do participante logado",
			description = "Participações INCLUIDO e RETIRADO do usuário do token, das mais recentes para as mais antigas, "
					+ "com a próxima visita agendada de cada uma (RF17).")
	public List<EstudoDoParticipanteResponse> estudos(@AuthenticationPrincipal Jwt token) {
		return servico.estudos(usuarioDo(token));
	}

	@GetMapping("/visitas")
	@Operation(summary = "Visitas do participante logado",
			description = "Visitas AGENDADA, REALIZADA e AUSENTE de todas as participações do usuário do token, "
					+ "por data e hora. As canceladas não aparecem (RF18).")
	public List<VisitaDoParticipanteResponse> visitas(@AuthenticationPrincipal Jwt token) {
		return servico.visitas(usuarioDo(token));
	}

	private static Long usuarioDo(Jwt token) {
		return Long.valueOf(token.getSubject());
	}

}
