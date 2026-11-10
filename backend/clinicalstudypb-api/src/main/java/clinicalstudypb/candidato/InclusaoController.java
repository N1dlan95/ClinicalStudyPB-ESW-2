package clinicalstudypb.candidato;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.candidato.dto.InclusaoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF11: inclusão do candidato no estudo
@RestController
@Tag(name = "Inclusão", description = "Inclusão de candidatos nos estudos")
public class InclusaoController {

	private final InclusaoService servico;

	public InclusaoController(InclusaoService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/inclusao")
	@Operation(summary = "Inclui um candidato", description = "Inclui um candidato elegível em um estudo clínico.")
	public InclusaoResponse incluir(@PathVariable Long candidatoId) {
		return servico.incluir(candidatoId);
	}

}
