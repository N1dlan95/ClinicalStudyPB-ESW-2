package clinicalstudypb.visitaprevista;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.visitaprevista.dto.VisitaPrevistaRequest;
import clinicalstudypb.visitaprevista.dto.VisitaPrevistaResponse;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/estudos/{estudoId}/visitas-previstas")
@Tag(name = "Visitas previstas", description = "Visitas previstas dos estudos clínicos")
public class VisitaPrevistaController {

	private final VisitaPrevistaService servico;

	public VisitaPrevistaController(VisitaPrevistaService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Lista visitas previstas", description = "Lista as visitas previstas de um estudo.")
	public List<VisitaPrevistaResponse> listar(@PathVariable Long estudoId) {
		return servico.listar(estudoId).stream().map(VisitaPrevistaResponse::de).toList();
	}

	@PostMapping
	@Operation(summary = "Cadastra uma visita prevista", description = "Adiciona uma visita prevista ao estudo.")
	public ResponseEntity<VisitaPrevistaResponse> criar(@PathVariable Long estudoId,
			@RequestBody @Valid VisitaPrevistaRequest dados) {
		VisitaPrevista visita = servico.criar(estudoId, dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudoId + "/visitas-previstas/" + visita.getId()))
				.body(VisitaPrevistaResponse.de(visita));
	}

	@PutMapping("/{visitaId}")
	@Operation(summary = "Atualiza uma visita prevista", description = "Atualiza os dados de uma visita prevista.")
	public VisitaPrevistaResponse atualizar(@PathVariable Long estudoId, @PathVariable Long visitaId,
			@RequestBody @Valid VisitaPrevistaRequest dados) {
		return VisitaPrevistaResponse.de(servico.atualizar(estudoId, visitaId, dados));
	}

	@DeleteMapping("/{visitaId}")
	@Operation(summary = "Remove uma visita prevista", description = "Exclui uma visita prevista do estudo.")
	public ResponseEntity<Void> excluir(@PathVariable Long estudoId, @PathVariable Long visitaId) {
		servico.excluir(estudoId, visitaId);
		return ResponseEntity.noContent().build();
	}
}
