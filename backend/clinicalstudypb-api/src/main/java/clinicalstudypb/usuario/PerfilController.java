package clinicalstudypb.usuario;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.usuario.dto.PerfilDetalheResponse;

// RF03: perfis disponíveis e suas permissões (preenche a escolha de perfil no cadastro de usuário)
@RestController
@RequestMapping("/perfis")
public class PerfilController {

	private final UsuarioService servico;

	public PerfilController(UsuarioService servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<PerfilDetalheResponse> listar() {
		return servico.listarPerfis().stream().map(PerfilDetalheResponse::de).toList();
	}

}
