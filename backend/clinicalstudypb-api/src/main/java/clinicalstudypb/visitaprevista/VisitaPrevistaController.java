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

@RestController
@RequestMapping("/estudos/{estudoId}/visitas-previstas")
public class VisitaPrevistaController {

	private final VisitaPrevistaService servico;

	public VisitaPrevistaController(VisitaPrevistaService servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<VisitaPrevistaResponse> listar(@PathVariable Long estudoId) {
		return servico.listar(estudoId).stream().map(VisitaPrevistaResponse::de).toList();
	}

	@PostMapping
	public ResponseEntity<VisitaPrevistaResponse> criar(@PathVariable Long estudoId,
			@RequestBody @Valid VisitaPrevistaRequest dados) {
		VisitaPrevista visita = servico.criar(estudoId, dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudoId + "/visitas-previstas/" + visita.getId()))
				.body(VisitaPrevistaResponse.de(visita));
	}

	@PutMapping("/{visitaId}")
	public VisitaPrevistaResponse atualizar(@PathVariable Long estudoId, @PathVariable Long visitaId,
			@RequestBody @Valid VisitaPrevistaRequest dados) {
		return VisitaPrevistaResponse.de(servico.atualizar(estudoId, visitaId, dados));
	}

	@DeleteMapping("/{visitaId}")
	public ResponseEntity<Void> excluir(@PathVariable Long estudoId, @PathVariable Long visitaId) {
		servico.excluir(estudoId, visitaId);
		return ResponseEntity.noContent().build();
	}
}
