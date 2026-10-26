package clinicalstudypb.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.AuthController;
import clinicalstudypb.auth.AuthService;
import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokenService;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.PerfilController;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioController;
import clinicalstudypb.usuario.UsuarioService;

// RF03: acesso permitido e negado por perfil, com tokens JWT reais (o perfil vem da claim do token)
@WebMvcTest({ UsuarioController.class, PerfilController.class, AuthController.class })
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, TokenService.class,
		RespostaNaoAutenticado.class, RespostaSemPermissao.class })
class AutorizacaoTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@MockitoBean
	private UsuarioService usuarioService;

	@MockitoBean
	private AuthService authService;

	@BeforeEach
	void configurar() {
		when(usuarioService.listar(any(), any(), any(), any())).thenReturn(Page.empty());
		when(usuarioService.buscar(any())).thenReturn(usuario(1L, Perfil.PESQUISADOR));
		when(usuarioService.alterarAtivo(any(), any(Boolean.class))).thenReturn(usuario(1L, Perfil.PESQUISADOR));
		when(usuarioService.listarPerfis()).thenReturn(List.of(Perfil.values()));
	}

	// ---- Usuários e perfis (RF01): somente administrador

	@Test
	void administradorAcessaUsuariosEPerfis() throws Exception {
		String token = tokenDe(Perfil.ADMINISTRADOR);

		mvc.perform(comToken(get("/usuarios"), token)).andExpect(status().isOk());
		mvc.perform(comToken(get("/usuarios/1"), token)).andExpect(status().isOk());
		mvc.perform(comToken(patch("/usuarios/1/status").contentType(MediaType.APPLICATION_JSON)
				.content("{\"ativo\": false}"), token)).andExpect(status().isOk());
		mvc.perform(comToken(get("/perfis"), token)).andExpect(status().isOk());
	}

	@ParameterizedTest
	@EnumSource(value = Perfil.class, names = "ADMINISTRADOR", mode = EnumSource.Mode.EXCLUDE)
	void outrosPerfisNaoAcessamUsuariosNemPerfis(Perfil perfil) throws Exception {
		String token = tokenDe(perfil);

		mvc.perform(comToken(get("/usuarios"), token))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403))
				.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
		mvc.perform(comToken(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("{}"), token))
				.andExpect(status().isForbidden());
		mvc.perform(comToken(put("/usuarios/1").contentType(MediaType.APPLICATION_JSON).content("{}"), token))
				.andExpect(status().isForbidden());
		mvc.perform(comToken(patch("/usuarios/1/status").contentType(MediaType.APPLICATION_JSON)
				.content("{\"ativo\": false}"), token)).andExpect(status().isForbidden());
		mvc.perform(comToken(get("/perfis"), token)).andExpect(status().isForbidden());
	}

	// ---- Autenticação: qualquer perfil logado

	@ParameterizedTest
	@EnumSource(Perfil.class)
	void todoPerfilLogadoConsultaOsPropriosDados(Perfil perfil) throws Exception {
		mvc.perform(comToken(get("/auth/me"), tokenDe(perfil))).andExpect(status().isOk());
	}

	@Test
	void semTokenRetorna401EmVezDe403() throws Exception {
		mvc.perform(get("/usuarios"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
	}

	// ---- Estudos (RF04): a regra já vale antes dos endpoints existirem (task 3238).
	// Acesso liberado chega ao Spring MVC e, sem controller, responde 404; acesso negado responde 403.

	@ParameterizedTest
	@EnumSource(value = Perfil.class, names = { "PESQUISADOR", "COORDENADOR", "ADMINISTRADOR" })
	void perfisDoPainelConsultamEstudos(Perfil perfil) throws Exception {
		mvc.perform(comToken(get("/estudos"), tokenDe(perfil))).andExpect(status().isNotFound());
	}

	@Test
	void participanteNaoConsultaEstudosPeloPainel() throws Exception {
		mvc.perform(comToken(get("/estudos"), tokenDe(Perfil.PARTICIPANTE))).andExpect(status().isForbidden());
		mvc.perform(comToken(get("/estudos/1"), tokenDe(Perfil.PARTICIPANTE))).andExpect(status().isForbidden());
	}

	@Test
	void pesquisadorCadastraEEditaEstudos() throws Exception {
		String token = tokenDe(Perfil.PESQUISADOR);

		mvc.perform(comToken(post("/estudos"), token)).andExpect(status().isNotFound());
		mvc.perform(comToken(put("/estudos/1"), token)).andExpect(status().isNotFound());
	}

	@ParameterizedTest
	@EnumSource(value = Perfil.class, names = "PESQUISADOR", mode = EnumSource.Mode.EXCLUDE)
	void somentePesquisadorCadastraEEditaEstudos(Perfil perfil) throws Exception {
		String token = tokenDe(perfil);

		mvc.perform(comToken(post("/estudos"), token)).andExpect(status().isForbidden());
		mvc.perform(comToken(put("/estudos/1"), token)).andExpect(status().isForbidden());
	}

	// ---- Rotas sem regra e CORS

	@Test
	void rotaSemRegraFicaBloqueada() throws Exception {
		mvc.perform(comToken(get("/qualquer-coisa"), tokenDe(Perfil.ADMINISTRADOR)))
				.andExpect(status().isForbidden());
	}

	@Test
	void preflightDeOrigemLiberadaPassaPeloCors() throws Exception {
		mvc.perform(options("/usuarios")
				.header("Origin", "http://localhost:5173")
				.header("Access-Control-Request-Method", "GET")
				.header("Access-Control-Request-Headers", "Authorization"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
	}

	@Test
	void preflightDeOrigemDesconhecidaERecusado() throws Exception {
		mvc.perform(options("/usuarios")
				.header("Origin", "http://site-desconhecido.test")
				.header("Access-Control-Request-Method", "GET"))
				.andExpect(status().isForbidden());
	}

	private String tokenDe(Perfil perfil) {
		return tokens.gerar(usuario(1L, perfil)).valor();
	}

	private static MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder requisicao, String token) {
		return requisicao.header("Authorization", "Bearer " + token);
	}

	private static Usuario usuario(Long id, Perfil perfil) {
		Usuario usuario = new Usuario("Teste", "teste@teste.com", null, perfil, "hash");
		ReflectionTestUtils.setField(usuario, "id", id);
		return usuario;
	}

}
