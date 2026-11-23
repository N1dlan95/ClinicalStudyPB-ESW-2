package clinicalstudypb.historico;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.historico.dto.HistoricoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF15: histórico do participante. Perfis no SecurityConfig: pesquisador, coordenador e administrador,
// por uma regra que fica antes da de /candidatos/** (que é só do coordenador).
@RestController
@Tag(name = "Histórico", description = "Histórico de visitas e resultados do participante")
public class HistoricoController {

	private final HistoricoService servico;

	public HistoricoController(HistoricoService servico) {
		this.servico = servico;
	}

	@GetMapping("/candidatos/{id}/historico")
	@Operation(summary = "Histórico de visitas e resultados do participante (RF15)",
			description = "Somente leitura. Dados da participação (com a retirada, se houver) e todas as visitas, "
					+ "da mais antiga para a mais recente, cada uma com os resultados registrados. "
					+ "Candidato que nunca foi incluído responde 409 PARTICIPANTE_NAO_INCLUIDO.")
	public HistoricoResponse consultar(@PathVariable Long id) {
		return servico.consultar(id);
	}

}
