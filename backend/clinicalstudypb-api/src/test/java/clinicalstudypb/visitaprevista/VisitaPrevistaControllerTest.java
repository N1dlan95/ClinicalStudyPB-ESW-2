package clinicalstudypb.visitaprevista;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
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
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.visitaprevista.dto.VisitaPrevistaRequest;

@WebMvcTest(VisitaPrevistaController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, VisitaPrevistaControllerTest.RespostasDeSeguranca.class })
@WithMockUser(roles = "PESQUISADOR")
class VisitaPrevistaControllerTest {

	@TestConfiguration
	@ComponentScan(basePackages = "clinicalstudypb.config.erro", useDefaultFilters = false,
			includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
					classes = { AuthenticationEntryPoint.class, AccessDeniedHandler.class }))
	static class RespostasDeSeguranca {
	}

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private VisitaPrevistaService servico;

	private static final String CORPO_VALIDO = """
			{"ordem":1,"nome":"Visita de triagem","diaPrevisto":0,"janelaDias":2,
			 "descricao":"Avaliação inicial","atividades":[{"ordem":1,"descricao":"Coleta de sangue"}]}
			""";

	@Test
	void listarRetornaVisitasComAtividades() throws Exception {
		when(servico.listar(1L)).thenReturn(List.of(visita(2L)));

		mvc.perform(get("/estudos/1/visitas-previstas"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].nome").value("Visita de triagem"))
				.andExpect(jsonPath("$[0].atividades[0].descricao").value("Coleta de sangue"));
	}

	@Test
	void criarRetorna201() throws Exception {
		when(servico.criar(eq(1L), any(VisitaPrevistaRequest.class))).thenReturn(visita(2L));

		mvc.perform(post("/estudos/1/visitas-previstas").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "/api/estudos/1/visitas-previstas/2"))
				.andExpect(jsonPath("$.id").value(2));
	}

	@Test
	void atualizarRetorna200() throws Exception {
		when(servico.atualizar(eq(1L), eq(2L), any(VisitaPrevistaRequest.class))).thenReturn(visita(2L));

		mvc.perform(put("/estudos/1/visitas-previstas/2").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(2));
	}

	@Test
	void excluirRetorna204() throws Exception {
		mvc.perform(delete("/estudos/1/visitas-previstas/2"))
				.andExpect(status().isNoContent());
	}

	@Test
	void dadosInvalidosRetornam400SemChamarServico() throws Exception {
		mvc.perform(post("/estudos/1/visitas-previstas").contentType(MediaType.APPLICATION_JSON).content("""
				{"ordem":0,"nome":"","diaPrevisto":-1,"atividades":[{"ordem":0,"descricao":""}]}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		verifyNoInteractions(servico);
	}

	@Test
	void ordemNegativaRetorna400SemChamarServico() throws Exception {
		mvc.perform(post("/estudos/1/visitas-previstas").contentType(MediaType.APPLICATION_JSON).content("""
				{"ordem":-1,"nome":"Visita de triagem","diaPrevisto":0,"atividades":[]}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		verifyNoInteractions(servico);
	}

	@Test
	void ordemNulaRetorna400SemChamarServico() throws Exception {
		mvc.perform(post("/estudos/1/visitas-previstas").contentType(MediaType.APPLICATION_JSON).content("""
				{"ordem":null,"nome":"Visita de triagem","diaPrevisto":0,"atividades":[]}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		verifyNoInteractions(servico);
	}

	private static VisitaPrevista visita(Long id) {
		Estudo estudo = mock(Estudo.class);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		VisitaPrevista visita = new VisitaPrevista(estudo, 1, "Visita de triagem", 0, 2, "Avaliação inicial");
		visita.substituirAtividades(List.of(new Atividade(1, "Coleta de sangue")));
		ReflectionTestUtils.setField(visita, "id", id);
		return visita;
	}
}
