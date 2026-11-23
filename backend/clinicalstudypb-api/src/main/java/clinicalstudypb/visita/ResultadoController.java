package clinicalstudypb.visita;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.visita.dto.ResultadosRequest;
import clinicalstudypb.visita.dto.ResultadosResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

// RF14: resultados das atividades da visita. Perfis no SecurityConfig: o GET para pesquisador, coordenador
// e administrador (consulta, inclusive no histórico); o PUT só para o coordenador, pela regra de /visitas/**.
@RestController
@Tag(name = "Resultados", description = "Resultados fictícios das atividades de uma visita realizada")
public class ResultadoController {

	private final ResultadoService servico;

	public ResultadoController(ResultadoService servico) {
		this.servico = servico;
	}

	@GetMapping("/visitas/{id}/resultados")
	@Operation(summary = "Lista as atividades da visita com os resultados",
			description = "Todas as atividades da visita prevista, na ordem, com o resultado ou vazio.")
	public ResultadosResponse listar(@PathVariable Long id) {
		return servico.listar(id);
	}

	@PutMapping("/visitas/{id}/resultados")
	@Operation(summary = "Registra os resultados da visita (RF14)",
			description = "Grava em lote; a atividade que já tem resultado é substituída. Só em visita REALIZADA.")
	public ResultadosResponse registrar(@PathVariable Long id, @Valid @RequestBody ResultadosRequest dados,
			@AuthenticationPrincipal Jwt token) {
		return servico.registrar(id, dados, Long.valueOf(token.getSubject()));
	}

}
