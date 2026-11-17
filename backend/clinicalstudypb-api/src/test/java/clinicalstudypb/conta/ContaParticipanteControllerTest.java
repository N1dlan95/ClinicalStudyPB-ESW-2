package clinicalstudypb.conta;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.conta.dto.ContaParticipanteResponse;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;

// Task 3751: rotas da conta do participante, somente coordenador
@WebMvcTest(ContaParticipanteController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class ContaParticipanteControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ContaParticipanteService servico;

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void consultarRetornaAContaSemSenha() throws Exception {
		when(servico.consultar(5L)).thenReturn(new ContaParticipanteResponse(7L, "joao@teste.com", true, true, null));

		mvc.perform(get("/candidatos/5/conta"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.usuarioId").value(7))
				.andExpect(jsonPath("$.email").value("joao@teste.com"))
				.andExpect(jsonPath("$.ativo").value(true))
				.andExpect(jsonPath("$.senhaProvisoria").doesNotExist());
	}

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void novaSenhaProvisoriaRetornaASenha() throws Exception {
		when(servico.redefinirSenha(5L))
				.thenReturn(new ContaParticipanteResponse(7L, "joao@teste.com", true, true, "Nn4pQr7sTu"));

		mvc.perform(post("/candidatos/5/conta/senha-provisoria"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.senhaProvisoria").value("Nn4pQr7sTu"));
	}

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void candidatoSemContaRetorna404() throws Exception {
		when(servico.consultar(5L))
				.thenThrow(new RecursoNaoEncontradoException("Este candidato ainda não tem conta de participante"));

		mvc.perform(get("/candidatos/5/conta"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	@WithMockUser(roles = { "PESQUISADOR" })
	void pesquisadorNaoAcessa() throws Exception {
		mvc.perform(get("/candidatos/5/conta")).andExpect(status().isForbidden());
		mvc.perform(post("/candidatos/5/conta/senha-provisoria")).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	@WithMockUser(roles = { "PARTICIPANTE" })
	void participanteNaoGeraSenhaParaSiPeloPainel() throws Exception {
		mvc.perform(post("/candidatos/5/conta/senha-provisoria")).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRetorna401() throws Exception {
		mvc.perform(get("/candidatos/5/conta")).andExpect(status().isUnauthorized());
	}

}
