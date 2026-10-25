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

// RF02: login, logout e dados do usuário logado
@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService servico;

	public AuthController(AuthService servico) {
		this.servico = servico;
	}

	@PostMapping("/login")
	public LoginResponse entrar(@RequestBody @Valid LoginRequest dados) {
		return servico.entrar(dados.email(), dados.senha());
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> sair(@AuthenticationPrincipal Jwt token) {
		servico.sair(token);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	public UsuarioLogadoResponse usuarioLogado(@AuthenticationPrincipal Jwt token) {
		return servico.usuarioLogado(token);
	}

}
