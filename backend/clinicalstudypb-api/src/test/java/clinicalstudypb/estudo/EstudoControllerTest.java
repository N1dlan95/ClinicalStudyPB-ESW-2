package clinicalstudypb.estudo;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.dto.EstudoRequest;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

@WebMvcTest(EstudoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, EstudoControllerTest.RespostasDeSeguranca.class })
@WithMockUser(roles = "PESQUISADOR")
class EstudoControllerTest {

	// Carrega as respostas 401/403 do pacote de erros, sejam quais forem as existentes
	@TestConfiguration
	@ComponentScan(basePackages = "clinicalstudypb.config.erro", useDefaultFilters = false,
			includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
					classes = { AuthenticationEntryPoint.class, AccessDeniedHandler.class }))
	static class RespostasDeSeguranca {
	}

	private static final String CORPO_VALIDO = """
			{"titulo": "Estudo de hipertensão", "objetivo": "Avaliar adesão ao tratamento",
			 "responsavelId": 2, "dataInicio": "2026-11-01", "dataFim": "2027-05-01", "limiteParticipantes": 30}
			""";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private EstudoService servico;

	@Test
	void criarRetorna201NoFormatoDoContrato() throws Exception {
		when(servico.criar(any(EstudoRequest.class))).thenReturn(estudo(7L));

		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "/api/estudos/7"))
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.titulo").value("Estudo de hipertensão"))
				.andExpect(jsonPath("$.responsavel.id").value(2))
				.andExpect(jsonPath("$.responsavel.nome").value("Ana Souza"))
				.andExpect(jsonPath("$.dataInicio").value("2026-11-01"))
				.andExpect(jsonPath("$.dataFim").value("2027-05-01"))
				.andExpect(jsonPath("$.limiteParticipantes").value(30))
				.andExpect(jsonPath("$.estado").value("PLANEJAMENTO"));
	}

	@Test
	void criarSemCamposObrigatoriosRetorna400ComOsCampos() throws Exception {
		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes.length()").value(5));
		verifyNoInteractions(servico);
	}

	@Test
	void criarComLimiteZeroRetorna400() throws Exception {
		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON).content("""
				{"titulo": "Estudo", "objetivo": "Objetivo", "responsavelId": 2,
				 "dataInicio": "2026-11-01", "limiteParticipantes": 0}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("limiteParticipantes"))
				.andExpect(jsonPath("$.detalhes[0].mensagem").value("O limite de participantes deve ser maior que zero"));
	}

	@Test
	void criarComDataEmFormatoInvalidoRetorna400() throws Exception {
		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON).content("""
				{"titulo": "Estudo", "objetivo": "Objetivo", "responsavelId": 2,
				 "dataInicio": "01/11/2026", "limiteParticipantes": 10}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void criarComTerminoAntesDoInicioRetorna400ApontandoDataFim() throws Exception {
		when(servico.criar(any(EstudoRequest.class))).thenThrow(
				new ValidacaoException("dataFim", "A data de término não pode ser anterior à data de início"));

		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataFim"))
				.andExpect(jsonPath("$.detalhes[0].mensagem").value("A data de término não pode ser anterior à data de início"));
	}

	@Test
	void listarRetornaPaginaComFiltros() throws Exception {
		when(servico.listar(eq(EstadoEstudo.PLANEJAMENTO), eq("hiper"), any()))
				.thenReturn(new PageImpl<>(List.of(estudo(1L)), PageRequest.of(0, 20), 1));

		mvc.perform(get("/estudos").param("estado", "PLANEJAMENTO").param("busca", "hiper"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].titulo").value("Estudo de hipertensão"))
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void listarComEstadoInexistenteRetorna400() throws Exception {
		mvc.perform(get("/estudos").param("estado", "ARQUIVADO"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void buscarInexistenteRetorna404() throws Exception {
		when(servico.buscar(99L)).thenThrow(new RecursoNaoEncontradoException("Estudo não encontrado"));

		mvc.perform(get("/estudos/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void atualizarRetorna200() throws Exception {
		when(servico.atualizar(eq(1L), any(EstudoRequest.class))).thenReturn(estudo(1L));

		mvc.perform(put("/estudos/1").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1));
	}

	@Test
	void atualizarEstudoEncerradoRetorna409() throws Exception {
		when(servico.atualizar(eq(1L), any(EstudoRequest.class))).thenThrow(new RegraNegocioException(
				"ESTUDO_ENCERRADO", "Estudo encerrado não pode ser editado", HttpStatus.CONFLICT));

		mvc.perform(put("/estudos/1").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_ENCERRADO"));
	}

	private static Estudo estudo(Long id) {
		Usuario ana = new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
		ReflectionTestUtils.setField(ana, "id", 2L);
		Estudo estudo = new Estudo("Estudo de hipertensão", "Avaliar adesão ao tratamento", ana,
				LocalDate.of(2026, 11, 1), LocalDate.of(2027, 5, 1), 30);
		ReflectionTestUtils.setField(estudo, "id", id);
		return estudo;
	}

}
