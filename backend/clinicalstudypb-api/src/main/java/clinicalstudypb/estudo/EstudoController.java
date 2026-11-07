package clinicalstudypb.estudo;

import java.net.URI;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.config.PaginaResponse;
import clinicalstudypb.estudo.dto.EstudoRequest;
import clinicalstudypb.estudo.dto.EstudoEstadoRequest;
import clinicalstudypb.estudo.dto.EstudoResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF04: cadastro de estudos
@RestController
@RequestMapping("/estudos")
@Tag(name = "Estudos", description = "Cadastro, consulta e alteração de estudos clínicos")
public class EstudoController {

	private final EstudoService servico;

	public EstudoController(EstudoService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Lista estudos", description = "Lista estudos com filtros de estado e busca.")
	public PaginaResponse<EstudoResponse> listar(
			@RequestParam(required = false) EstadoEstudo estado,
			@RequestParam(required = false) String busca,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		PageRequest paginacao = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dataInicio").and(Sort.by("id")));
		return PaginaResponse.de(servico.listar(estado, busca, paginacao), EstudoResponse::de);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Consulta um estudo", description = "Retorna os dados de um estudo pelo identificador.")
	public EstudoResponse buscar(@PathVariable Long id) {
		return EstudoResponse.de(servico.buscar(id));
	}

	@PostMapping
	@Operation(summary = "Cadastra um estudo", description = "Cria um novo estudo clínico.")
	public ResponseEntity<EstudoResponse> criar(@RequestBody @Valid EstudoRequest dados) {
		Estudo estudo = servico.criar(dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudo.getId()))
				.body(EstudoResponse.de(estudo));
	}

	@PutMapping("/{id}")
	@Operation(summary = "Atualiza um estudo", description = "Atualiza os dados cadastrais de um estudo.")
	public EstudoResponse atualizar(@PathVariable Long id, @RequestBody @Valid EstudoRequest dados) {
		return EstudoResponse.de(servico.atualizar(id, dados));
	}

	@PatchMapping("/{id}/estado")
	@Operation(summary = "Altera o estado do estudo", description = "Aplica uma transição válida ao estado de um estudo.")
	public EstudoResponse alterarEstado(@PathVariable Long id, @RequestBody @Valid EstudoEstadoRequest dados) {
		return EstudoResponse.de(servico.alterarEstado(id, dados));
	}

}
