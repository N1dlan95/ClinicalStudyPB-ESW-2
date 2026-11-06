package clinicalstudypb.criterio;

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

import clinicalstudypb.criterio.dto.CriterioRequest;
import clinicalstudypb.criterio.dto.CriterioResponse;
import jakarta.validation.Valid;

// RF05: critérios de inclusão e exclusão de um estudo
@RestController
@RequestMapping("/estudos/{estudoId}/criterios")
public class CriterioController {

	private final CriterioService servico;

	public CriterioController(CriterioService servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<CriterioResponse> listar(@PathVariable Long estudoId) {
		return servico.listar(estudoId).stream().map(CriterioResponse::de).toList();
	}

	@PostMapping
	public ResponseEntity<CriterioResponse> criar(@PathVariable Long estudoId, @RequestBody @Valid CriterioRequest dados) {
		Criterio criterio = servico.criar(estudoId, dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudoId + "/criterios/" + criterio.getId()))
				.body(CriterioResponse.de(criterio));
	}

	@PutMapping("/{id}")
	public CriterioResponse atualizar(@PathVariable Long estudoId, @PathVariable Long id,
			@RequestBody @Valid CriterioRequest dados) {
		return CriterioResponse.de(servico.atualizar(estudoId, id, dados));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> remover(@PathVariable Long estudoId, @PathVariable Long id) {
		servico.remover(estudoId, id);
		return ResponseEntity.noContent().build();
	}

}
