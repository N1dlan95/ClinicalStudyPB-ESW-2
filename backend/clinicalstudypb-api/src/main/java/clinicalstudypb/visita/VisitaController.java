package clinicalstudypb.visita;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.visita.dto.VisitaReagendamentoRequest;
import clinicalstudypb.visita.dto.VisitaRequest;
import clinicalstudypb.visita.dto.VisitaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

// RF12: agendamento das visitas. Perfis no SecurityConfig:
// /candidatos/** e /visitas/** somente coordenador; GET /estudos/{id}/visitas para quem consulta estudos.
@RestController
@Tag(name = "Visitas", description = "Agendamento e registro das visitas dos participantes")
public class VisitaController {

	private final VisitaService servico;

	public VisitaController(VisitaService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/visitas")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Agenda uma visita", description = "Agenda uma visita prevista para um participante incluído.")
	public VisitaResponse agendar(@PathVariable Long candidatoId, @Valid @RequestBody VisitaRequest dados,
			@AuthenticationPrincipal Jwt token) {
		return servico.agendar(candidatoId, dados, Long.valueOf(token.getSubject()));
	}

	@GetMapping("/candidatos/{candidatoId}/visitas")
	@Operation(summary = "Lista as visitas do participante")
	public List<VisitaResponse> listarDoParticipante(@PathVariable Long candidatoId) {
		return servico.listarDoParticipante(candidatoId);
	}

	@GetMapping("/estudos/{id}/visitas")
	@Operation(summary = "Agenda de visitas do estudo",
			description = "Filtros opcionais: status e período [de, ate), em data e hora ISO.")
	public List<VisitaResponse> listarDoEstudo(@PathVariable Long id,
			@RequestParam(required = false) StatusVisita status,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime de,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime ate) {
		return servico.listarDoEstudo(id, status, de, ate);
	}

	@GetMapping("/visitas/{id}")
	@Operation(summary = "Detalha uma visita")
	public VisitaResponse buscar(@PathVariable Long id) {
		return servico.buscar(id);
	}

	@PutMapping("/visitas/{id}")
	@Operation(summary = "Reagenda uma visita", description = "Muda data, hora e local de uma visita ainda agendada.")
	public VisitaResponse reagendar(@PathVariable Long id, @Valid @RequestBody VisitaReagendamentoRequest dados) {
		return servico.reagendar(id, dados);
	}

}
