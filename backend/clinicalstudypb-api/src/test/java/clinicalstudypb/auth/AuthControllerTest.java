package clinicalstudypb.auth;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Fluxo completo de login, /auth/me e logout com tokens reais; só o banco é simulado
@WebMvcTest(AuthController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, TokenService.class, AuthService.class,
		RespostaNaoAutenticado.class, RespostaSemPermissao.class })
class AuthControllerTest {

	private static final String SENHA = "Senha@123";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private PasswordEncoder codificadorSenha;

	@MockitoBean
	private UsuarioRepository usuarios;

	private Usuario ana;

	@BeforeEach
	void configurar() {
		ana = new Usuario("Ana Souza", "ana@teste.com", "PES-1", Perfil.PESQUISADOR, codificadorSenha.encode(SENHA));
		ReflectionTestUtils.setField(ana, "id", 1L);
		when(usuarios.findByEmailIgnoreCase("ana@teste.com")).thenReturn(Optional.of(ana));
		when(usuarios.findById(1L)).thenReturn(Optional.of(ana));
	}

	@Test
	void loginComCredenciaisCorretasRetornaTokenEUsuario() throws Exception {
		mvc.perform(login("ana@teste.com", SENHA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty())
				.andExpect(jsonPath("$.tipo").value("Bearer"))
				.andExpect(jsonPath("$.expiraEm").isNotEmpty())
				.andExpect(jsonPath("$.usuario.id").value(1))
				.andExpect(jsonPath("$.usuario.perfil").value("PESQUISADOR"))
				.andExpect(jsonPath("$.usuario.permissoes[0]").value("ESTUDO_CRIAR"))
				.andExpect(jsonPath("$.usuario.senhaHash").doesNotExist());
	}

	@Test
	void loginComSenhaErradaRetorna401() throws Exception {
		mvc.perform(login("ana@teste.com", "senhaErrada"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codigo").value("CREDENCIAIS_INVALIDAS"));
	}

	@Test
	void loginComEmailInexistenteRetorna401() throws Exception {
		mvc.perform(login("ninguem@teste.com", SENHA))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codigo").value("CREDENCIAIS_INVALIDAS"));
	}

	@Test
	void loginDeUsuarioInativoRetorna401() throws Exception {
		ana.definirAtivo(false);

		mvc.perform(login("ana@teste.com", SENHA))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codigo").value("USUARIO_INATIVO"));
	}

	@Test
	void loginSemSenhaRetorna400() throws Exception {
		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "ana@teste.com"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("senha"));
	}

	@Test
	void meSemTokenRetorna401NoFormatoDeErro() throws Exception {
		mvc.perform(get("/auth/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
	}

	@Test
	void meComTokenInvalidoRetorna401() throws Exception {
		mvc.perform(get("/auth/me").header("Authorization", "Bearer token.invalido.qualquer"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
	}

	@Test
	void meComTokenValidoRetornaUsuarioEPermissoes() throws Exception {
		String token = entrar();

		mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("ana@teste.com"))
				.andExpect(jsonPath("$.permissoes.length()").value(3));
	}

	@Test
	void meDeUsuarioDesativadoDepoisDoLoginRetorna401() throws Exception {
		String token = entrar();
		ana.definirAtivo(false);

		mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void logoutEncerraOToken() throws Exception {
		String token = entrar();

		mvc.perform(post("/auth/logout").header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void logoutSemTokenRetorna401() throws Exception {
		mvc.perform(post("/auth/logout"))
				.andExpect(status().isUnauthorized());
	}

	private String entrar() throws Exception {
		String resposta = mvc.perform(login("ana@teste.com", SENHA))
				.andReturn().getResponse().getContentAsString();
		return JsonPath.read(resposta, "$.token");
	}

	private static org.springframework.test.web.servlet.RequestBuilder login(String email, String senha) {
		return post("/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"%s\", \"senha\": \"%s\"}".formatted(email, senha));
	}

}
