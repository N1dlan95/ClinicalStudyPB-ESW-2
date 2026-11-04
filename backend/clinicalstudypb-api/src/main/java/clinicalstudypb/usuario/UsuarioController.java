package clinicalstudypb.usuario;

import java.net.URI;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.config.PaginaResponse;
import clinicalstudypb.usuario.dto.UsuarioAtualizacaoRequest;
import clinicalstudypb.usuario.dto.UsuarioCriacaoRequest;
import clinicalstudypb.usuario.dto.UsuarioResponse;
import clinicalstudypb.usuario.dto.UsuarioStatusRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

// RF01: cadastro e gestão de usuários
@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

	private final UsuarioService servico;

	public UsuarioController(UsuarioService servico) {
		this.servico = servico;
	}

	@GetMapping
	public PaginaResponse<UsuarioResponse> listar(
			@RequestParam(required = false) Perfil perfil,
			@RequestParam(required = false) Boolean ativo,
			@RequestParam(required = false) String busca,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		PageRequest paginacao = PageRequest.of(page, size, Sort.by("nome"));
		return PaginaResponse.de(servico.listar(perfil, ativo, busca, paginacao), UsuarioResponse::de);
	}

	@GetMapping("/{id}")
	public UsuarioResponse buscar(@PathVariable Long id) {
		return UsuarioResponse.de(servico.buscar(id));
	}

	@PostMapping
	public ResponseEntity<UsuarioResponse> criar(@RequestBody @Valid UsuarioCriacaoRequest dados) {
		Usuario usuario = servico.criar(dados);
		return ResponseEntity.created(URI.create("/api/usuarios/" + usuario.getId()))
				.body(UsuarioResponse.de(usuario));
	}

	@PutMapping("/{id}")
	public UsuarioResponse atualizar(@PathVariable Long id, @RequestBody @Valid UsuarioAtualizacaoRequest dados) {
		return UsuarioResponse.de(servico.atualizar(id, dados));
	}

	@PatchMapping("/{id}/status")
	public UsuarioResponse alterarStatus(@PathVariable Long id, @RequestBody @Valid UsuarioStatusRequest dados) {
		return UsuarioResponse.de(servico.alterarAtivo(id, dados.ativo()));
	}

}
