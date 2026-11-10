package clinicalstudypb.candidato;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.candidato.dto.InclusaoResponse;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;

@WebMvcTest(InclusaoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class InclusaoControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private InclusaoService servico;

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void incluirRetornaAsVagasOcupadasEOTotal() throws Exception {
		when(servico.incluir(5L)).thenReturn(new InclusaoResponse(12, 30));

		mvc.perform(post("/candidatos/5/inclusao"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.vagasOcupadas").value(12))
				.andExpect(jsonPath("$.limiteParticipantes").value(30));
	}

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void vagasEsgotadasRetorna409() throws Exception {
		when(servico.incluir(5L)).thenThrow(new RegraNegocioException("VAGAS_ESGOTADAS",
				"Todas as vagas do estudo estão ocupadas", HttpStatus.CONFLICT));

		mvc.perform(post("/candidatos/5/inclusao"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VAGAS_ESGOTADAS"))
				.andExpect(jsonPath("$.mensagem").value("Todas as vagas do estudo estão ocupadas"));
	}

	@Test
	@WithMockUser(roles = "COORDENADOR")
	void candidatoInexistenteRetorna404() throws Exception {
		when(servico.incluir(99L)).thenThrow(new RecursoNaoEncontradoException("Candidato não encontrado"));

		mvc.perform(post("/candidatos/99/inclusao"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	@WithMockUser(roles = "PESQUISADOR")
	void outroPerfilNaoInclui() throws Exception {
		mvc.perform(post("/candidatos/5/inclusao"))
				.andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

}
