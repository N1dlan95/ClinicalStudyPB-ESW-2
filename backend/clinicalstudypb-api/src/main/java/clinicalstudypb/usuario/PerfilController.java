package clinicalstudypb.usuario;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.usuario.dto.PerfilDetalheResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF03: perfis disponíveis e suas permissões (preenche a escolha de perfil no cadastro de usuário)
@RestController
@RequestMapping("/perfis")
@Tag(name = "Perfis", description = "Perfis e permissões do sistema")
public class PerfilController {

	private final UsuarioService servico;

	public PerfilController(UsuarioService servico) {
		this.servico = servico;
	}

	@GetMapping
	@Operation(summary = "Lista os perfis", description = "Retorna os perfis disponíveis e suas permissões.")
	public List<PerfilDetalheResponse> listar() {
		return servico.listarPerfis().stream().map(PerfilDetalheResponse::de).toList();
	}

}
