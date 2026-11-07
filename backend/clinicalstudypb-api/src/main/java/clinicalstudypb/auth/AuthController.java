package clinicalstudypb.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.auth.dto.LoginRequest;
import clinicalstudypb.auth.dto.LoginResponse;
import clinicalstudypb.auth.dto.UsuarioLogadoResponse;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// RF02: login, logout e dados do usuário logado
@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticação", description = "Autenticação de usuários")
public class AuthController {

	private final AuthService servico;

	public AuthController(AuthService servico) {
		this.servico = servico;
	}

	@PostMapping("/login")
	@Operation(summary = "Autentica um usuário", description = "Valida as credenciais e retorna o token JWT.")
	public LoginResponse entrar(@RequestBody @Valid LoginRequest dados) {
		return servico.entrar(dados.email(), dados.senha());
	}

	@PostMapping("/logout")
	@Operation(summary = "Encerra a sessão", description = "Revoga ou encerra a sessão associada ao token atual.")
	public ResponseEntity<Void> sair(@AuthenticationPrincipal Jwt token) {
		servico.sair(token);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	@Operation(summary = "Consulta o usuário autenticado", description = "Retorna os dados do usuário associado ao token JWT.")
	public UsuarioLogadoResponse usuarioLogado(@AuthenticationPrincipal Jwt token) {
		return servico.usuarioLogado(token);
	}

}
