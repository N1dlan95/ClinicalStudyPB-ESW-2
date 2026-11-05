package clinicalstudypb.candidato;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.candidato.dto.InclusaoResponse;

// RF11: inclusão do candidato no estudo
@RestController
public class InclusaoController {

	private final InclusaoService servico;

	public InclusaoController(InclusaoService servico) {
		this.servico = servico;
	}

	@PostMapping("/candidatos/{candidatoId}/inclusao")
	public InclusaoResponse incluir(@PathVariable Long candidatoId) {
		return servico.incluir(candidatoId);
	}

}
