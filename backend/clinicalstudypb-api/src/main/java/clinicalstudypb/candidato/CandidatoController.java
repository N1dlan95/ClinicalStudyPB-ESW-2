package clinicalstudypb.candidato;

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

import clinicalstudypb.candidato.dto.CandidatoRequest;
import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.config.PaginaResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF08: candidatos vinculados a um estudo
@RestController
@RequestMapping("/estudos/{estudoId}/candidatos")
@Tag(name = "Candidatos", description = "Candidatos vinculados aos estudos clínicos")
public class CandidatoController {

	private final CandidatoService servico;

	public CandidatoController(CandidatoService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Lista candidatos", description = "Lista candidatos de um estudo com filtros opcionais.")
	public PaginaResponse<CandidatoResponse> listar(
			@PathVariable Long estudoId,
			@RequestParam(required = false) StatusCandidato status,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		PageRequest paginacao = PageRequest.of(page, size, Sort.by("nome").and(Sort.by("id")));
		return PaginaResponse.de(servico.listar(estudoId, status, paginacao), CandidatoResponse::de);
	}

	@GetMapping("/{id}")
	@Operation(summary = "Consulta um candidato", description = "Retorna os dados de um candidato pelo identificador.")
	public CandidatoResponse buscar(@PathVariable Long estudoId, @PathVariable Long id) {
		return CandidatoResponse.de(servico.buscar(estudoId, id));
	}

	@PostMapping
	@Operation(summary = "Cadastra um candidato", description = "Vincula um candidato a um estudo clínico.")
	public ResponseEntity<CandidatoResponse> criar(@PathVariable Long estudoId,
			@RequestBody @Valid CandidatoRequest dados) {
		Candidato candidato = servico.criar(estudoId, dados);
		return ResponseEntity.created(URI.create("/api/estudos/" + estudoId + "/candidatos/" + candidato.getId()))
				.body(CandidatoResponse.de(candidato));
	}

	@PutMapping("/{id}")
	@Operation(summary = "Atualiza um candidato", description = "Atualiza os dados de um candidato do estudo.")
	public CandidatoResponse atualizar(@PathVariable Long estudoId, @PathVariable Long id,
			@RequestBody @Valid CandidatoRequest dados) {
		return CandidatoResponse.de(servico.atualizar(estudoId, id, dados));
	}

}
