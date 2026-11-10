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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF05: critérios de inclusão e exclusão de um estudo
@RestController
@RequestMapping("/estudos/{estudoId}/criterios")
@Tag(name = "Critérios", description = "Critérios de elegibilidade dos estudos clínicos")
public class CriterioController {

	private final CriterioService servico;

	public CriterioController(CriterioService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Lista critérios", description = "Lista os critérios de elegibilidade de um estudo.")
	public List<CriterioResponse> listar(@PathVariable Long estudoId) {
		return servico.listar(estudoId).stream().map(CriterioResponse::de).toList();
	}

	@PostMapping
	@Operation(summary = "Cadastra um critério", description = "Adiciona um critério a um estudo.")
	public ResponseEntity<CriterioResponse> criar(@PathVariable Long estudoId, @RequestBody @Valid CriterioRequest dados) {
		Criterio criterio = servico.criar(estudoId, dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudoId + "/criterios/" + criterio.getId()))
				.body(CriterioResponse.de(criterio));
	}

	@PutMapping("/{id}")
	@Operation(summary = "Atualiza um critério", description = "Atualiza um critério de elegibilidade do estudo.")
	public CriterioResponse atualizar(@PathVariable Long estudoId, @PathVariable Long id,
			@RequestBody @Valid CriterioRequest dados) {
		return CriterioResponse.de(servico.atualizar(estudoId, id, dados));
	}

	@DeleteMapping("/{id}")
	@Operation(summary = "Remove um critério", description = "Exclui um critério de elegibilidade do estudo.")
	public ResponseEntity<Void> remover(@PathVariable Long estudoId, @PathVariable Long id) {
		servico.remover(estudoId, id);
		return ResponseEntity.noContent().build();
	}

}
