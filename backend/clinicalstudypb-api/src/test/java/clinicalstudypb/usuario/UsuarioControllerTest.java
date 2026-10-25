package clinicalstudypb.usuario;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.usuario.dto.UsuarioAtualizacaoRequest;
import clinicalstudypb.usuario.dto.UsuarioCriacaoRequest;

@WebMvcTest({ UsuarioController.class, PerfilController.class })
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class })
@WithMockUser
class UsuarioControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private UsuarioService servico;

	@Test
	void criarRetorna201ComOUsuarioSemASenha() throws Exception {
		when(servico.criar(any(UsuarioCriacaoRequest.class))).thenReturn(usuario(7L));

		mvc.perform(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "Ana Souza", "email": "ana@teste.com", "perfil": "PESQUISADOR", "senha": "senha1234"}
				"""))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "/api/usuarios/7"))
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.email").value("ana@teste.com"))
				.andExpect(jsonPath("$.perfil").value("PESQUISADOR"))
				.andExpect(jsonPath("$.ativo").value(true))
				.andExpect(jsonPath("$.senha").doesNotExist())
				.andExpect(jsonPath("$.senhaHash").doesNotExist());
	}

	@Test
	void criarComDadosInvalidosRetorna400ComOsCampos() throws Exception {
		mvc.perform(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "An", "email": "invalido", "senha": "123"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes.length()").value(4))
				.andExpect(jsonPath("$.detalhes[?(@.campo == 'perfil')].mensagem").value("O perfil é obrigatório"));
		verifyNoInteractions(servico);
	}

	@Test
	void criarComPerfilInexistenteRetorna400() throws Exception {
		mvc.perform(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "Ana Souza", "email": "ana@teste.com", "perfil": "SUPERVISOR", "senha": "senha1234"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void criarComEmailDuplicadoRetorna409() throws Exception {
		when(servico.criar(any(UsuarioCriacaoRequest.class))).thenThrow(new RegraNegocioException(
				"EMAIL_DUPLICADO", "Já existe um usuário com este e-mail", HttpStatus.CONFLICT));

		mvc.perform(post("/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "Ana Souza", "email": "ana@teste.com", "perfil": "PESQUISADOR", "senha": "senha1234"}
				"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("EMAIL_DUPLICADO"))
				.andExpect(jsonPath("$.mensagem").value("Já existe um usuário com este e-mail"));
	}

	@Test
	void buscarInexistenteRetorna404() throws Exception {
		when(servico.buscar(99L)).thenThrow(new RecursoNaoEncontradoException("Usuário não encontrado"));

		mvc.perform(get("/usuarios/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void listarRetornaPaginaNoFormatoDoContrato() throws Exception {
		var paginacao = PageRequest.of(0, 20);
		when(servico.listar(eq(Perfil.PESQUISADOR), eq(true), eq("ana"), any()))
				.thenReturn(new PageImpl<>(List.of(usuario(1L)), paginacao, 1));

		mvc.perform(get("/usuarios").param("perfil", "PESQUISADOR").param("ativo", "true").param("busca", "ana"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].nome").value("Ana Souza"))
				.andExpect(jsonPath("$.number").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void listarComTamanhoDePaginaAcimaDoLimiteRetorna400() throws Exception {
		mvc.perform(get("/usuarios").param("size", "500"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void atualizarRetorna200() throws Exception {
		when(servico.atualizar(eq(1L), any(UsuarioAtualizacaoRequest.class))).thenReturn(usuario(1L));

		mvc.perform(put("/usuarios/1").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "Ana Souza", "email": "ana@teste.com", "perfil": "PESQUISADOR"}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1));
	}

	@Test
	void alterarStatusRetornaUsuarioAtualizado() throws Exception {
		Usuario desativado = usuario(1L);
		desativado.definirAtivo(false);
		when(servico.alterarAtivo(1L, false)).thenReturn(desativado);

		mvc.perform(patch("/usuarios/1/status").contentType(MediaType.APPLICATION_JSON).content("""
				{"ativo": false}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ativo").value(false));
	}

	@Test
	void alterarStatusSemCampoAtivoRetorna400() throws Exception {
		mvc.perform(patch("/usuarios/1/status").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("ativo"));
	}

	@Test
	void listarPerfisRetornaPermissoes() throws Exception {
		when(servico.listarPerfis()).thenReturn(List.of(Perfil.values()));

		mvc.perform(get("/perfis"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(4))
				.andExpect(jsonPath("$[1].perfil").value("PESQUISADOR"))
				.andExpect(jsonPath("$[1].permissoes[0]").value("ESTUDO_CRIAR"));
	}

	private static Usuario usuario(Long id) {
		Usuario usuario = new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
		ReflectionTestUtils.setField(usuario, "id", id);
		return usuario;
	}

}
