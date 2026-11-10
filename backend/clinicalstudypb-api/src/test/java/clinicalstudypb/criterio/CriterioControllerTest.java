package clinicalstudypb.criterio;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.criterio.dto.CriterioRequest;

@WebMvcTest(CriterioController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, CriterioControllerTest.RespostasDeSeguranca.class })
@WithMockUser(roles = "PESQUISADOR")
class CriterioControllerTest {

	// Carrega as respostas 401/403 do pacote de erros, sejam quais forem as existentes
	@TestConfiguration
	@ComponentScan(basePackages = "clinicalstudypb.config.erro", useDefaultFilters = false,
			includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
					classes = { AuthenticationEntryPoint.class, AccessDeniedHandler.class }))
	static class RespostasDeSeguranca {
	}

	private static final String CORPO_VALIDO = """
			{"tipo": "INCLUSAO", "descricao": "Idade acima de 18 anos", "ordem": 1}
			""";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private CriterioService servico;

	@Test
	void listarRetornaOsCriteriosDoEstudo() throws Exception {
		when(servico.listar(1L)).thenReturn(List.of(criterio(5L)));

		mvc.perform(get("/estudos/1/criterios"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(5))
				.andExpect(jsonPath("$[0].tipo").value("INCLUSAO"))
				.andExpect(jsonPath("$[0].descricao").value("Idade acima de 18 anos"))
				.andExpect(jsonPath("$[0].ordem").value(1));
	}

	@Test
	void listarDeEstudoInexistenteRetorna404() throws Exception {
		when(servico.listar(99L)).thenThrow(new RecursoNaoEncontradoException("Estudo não encontrado"));

		mvc.perform(get("/estudos/99/criterios"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void criarRetorna201ComLocation() throws Exception {
		when(servico.criar(eq(1L), any(CriterioRequest.class))).thenReturn(criterio(5L));

		mvc.perform(post("/estudos/1/criterios").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "/api/estudos/1/criterios/5"))
				.andExpect(jsonPath("$.id").value(5))
				.andExpect(jsonPath("$.tipo").value("INCLUSAO"));
	}

	@Test
	void criarSemCamposObrigatoriosRetorna400() throws Exception {
		mvc.perform(post("/estudos/1/criterios").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes.length()").value(2));
		verifyNoInteractions(servico);
	}

	@Test
	void criarComOrdemZeroRetorna400() throws Exception {
		mvc.perform(post("/estudos/1/criterios").contentType(MediaType.APPLICATION_JSON)
				.content("{\"tipo\": \"INCLUSAO\", \"descricao\": \"Idade acima de 18 anos\", \"ordem\": 0}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("ordem"));
	}

	@Test
	void criarComTipoInexistenteRetorna400() throws Exception {
		mvc.perform(post("/estudos/1/criterios").contentType(MediaType.APPLICATION_JSON)
				.content("{\"tipo\": \"OUTRO\", \"descricao\": \"Idade acima de 18 anos\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void criarComEstudoForaDoPlanejamentoRetorna409() throws Exception {
		when(servico.criar(eq(1L), any(CriterioRequest.class))).thenThrow(new RegraNegocioException(
				"ESTUDO_FORA_DO_PLANEJAMENTO", "Os critérios só podem ser alterados enquanto o estudo está em planejamento",
				HttpStatus.CONFLICT));

		mvc.perform(post("/estudos/1/criterios").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DO_PLANEJAMENTO"));
	}

	@Test
	void atualizarRetorna200() throws Exception {
		when(servico.atualizar(eq(1L), eq(5L), any(CriterioRequest.class))).thenReturn(criterio(5L));

		mvc.perform(put("/estudos/1/criterios/5").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(5));
	}

	@Test
	void atualizarCriterioInexistenteRetorna404() throws Exception {
		when(servico.atualizar(eq(1L), eq(99L), any(CriterioRequest.class)))
				.thenThrow(new RecursoNaoEncontradoException("Critério não encontrado"));

		mvc.perform(put("/estudos/1/criterios/99").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isNotFound());
	}

	@Test
	void removerRetorna204() throws Exception {
		mvc.perform(delete("/estudos/1/criterios/5")).andExpect(status().isNoContent());
	}

	@Test
	void removerCriterioEmUsoRetorna409() throws Exception {
		doThrow(new RegraNegocioException("CRITERIO_EM_USO", "O critério já foi usado em avaliações de candidatos e não pode ser removido",
				HttpStatus.CONFLICT)).when(servico).remover(1L, 5L);

		mvc.perform(delete("/estudos/1/criterios/5"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CRITERIO_EM_USO"));
	}

	private static Criterio criterio(Long id) {
		Criterio criterio = new Criterio(null, TipoCriterio.INCLUSAO, "Idade acima de 18 anos", 1);
		ReflectionTestUtils.setField(criterio, "id", id);
		return criterio;
	}

}
