package clinicalstudypb.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.auth.dto.LoginResponse;
import clinicalstudypb.auth.dto.UsuarioLogadoResponse;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// RF02: entrar e sair do sistema
@Service
public class AuthService {

	private final UsuarioRepository usuarios;
	private final PasswordEncoder codificadorSenha;
	private final TokenService tokens;
	private final TokensRevogados tokensRevogados;

	public AuthService(UsuarioRepository usuarios, PasswordEncoder codificadorSenha, TokenService tokens,
			TokensRevogados tokensRevogados) {
		this.usuarios = usuarios;
		this.codificadorSenha = codificadorSenha;
		this.tokens = tokens;
		this.tokensRevogados = tokensRevogados;
	}

	@Transactional(readOnly = true)
	public LoginResponse entrar(String email, String senha) {
		Usuario usuario = usuarios.findByEmailIgnoreCase(email.trim())
				.filter(encontrado -> codificadorSenha.matches(senha, encontrado.getSenhaHash()))
				.orElseThrow(() -> naoAutenticado("CREDENCIAIS_INVALIDAS", "E-mail ou senha incorretos"));
		// Só informa que está inativo para quem acertou a senha
		if (!usuario.isAtivo()) {
			throw naoAutenticado("USUARIO_INATIVO", "Usuário desativado. Procure o administrador");
		}
		TokenService.TokenGerado token = tokens.gerar(usuario);
		return new LoginResponse(token.valor(), token.expiraEm(), UsuarioLogadoResponse.de(usuario));
	}

	// Com JWT o cliente também descarta o token; aqui ele deixa de valer no backend
	public void sair(Jwt token) {
		tokensRevogados.revogar(token.getId(), token.getExpiresAt());
	}

	// Consulta o banco para refletir alterações feitas depois do login (ex.: usuário desativado)
	@Transactional(readOnly = true)
	public UsuarioLogadoResponse usuarioLogado(Jwt token) {
		return usuarios.findById(Long.valueOf(token.getSubject()))
				.filter(Usuario::isAtivo)
				.map(UsuarioLogadoResponse::de)
				.orElseThrow(() -> naoAutenticado("NAO_AUTENTICADO", "Sessão inválida. Entre novamente"));
	}

	private static RegraNegocioException naoAutenticado(String codigo, String mensagem) {
		return new RegraNegocioException(codigo, mensagem, HttpStatus.UNAUTHORIZED);
	}

}
