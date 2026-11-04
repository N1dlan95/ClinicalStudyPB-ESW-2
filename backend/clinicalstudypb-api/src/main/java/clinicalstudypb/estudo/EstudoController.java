package clinicalstudypb.estudo;

import java.net.URI;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.config.PaginaResponse;
import clinicalstudypb.estudo.dto.EstudoRequest;
import clinicalstudypb.estudo.dto.EstudoResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

// RF04: cadastro de estudos
@RestController
@RequestMapping("/estudos")
public class EstudoController {

	private final EstudoService servico;

	public EstudoController(EstudoService servico) {
		this.servico = servico;
	}

	@GetMapping
	public PaginaResponse<EstudoResponse> listar(
			@RequestParam(required = false) EstadoEstudo estado,
			@RequestParam(required = false) String busca,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		PageRequest paginacao = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataInicio").and(Sort.by("id")));
		return PaginaResponse.de(servico.listar(estado, busca, paginacao), EstudoResponse::de);
	}

	@GetMapping("/{id}")
	public EstudoResponse buscar(@PathVariable Long id) {
		return EstudoResponse.de(servico.buscar(id));
	}

	@PostMapping
	public ResponseEntity<EstudoResponse> criar(@RequestBody @Valid EstudoRequest dados) {
		Estudo estudo = servico.criar(dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudo.getId()))
				.body(EstudoResponse.de(estudo));
	}

	@PutMapping("/{id}")
	public EstudoResponse atualizar(@PathVariable Long id, @RequestBody @Valid EstudoRequest dados) {
		return EstudoResponse.de(servico.atualizar(id, dados));
	}

}
