package clinicalstudypb.visita;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.visita.dto.ResultadosRequest;
import clinicalstudypb.visita.dto.ResultadosResponse;

// Task 3763: rotas de resultados, validação do corpo e perfis (GET para quem consulta, PUT só coordenador)
@WebMvcTest(ResultadoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class ResultadoControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ResultadoService servico;

	@Test
	void listarParaPesquisadorCoordenadorEAdministrador() throws Exception {
		when(servico.listar(70L)).thenReturn(resposta());

		for (String perfil : List.of("PESQUISADOR", "COORDENADOR", "ADMINISTRADOR")) {
			mvc.perform(get("/visitas/70/resultados").with(como(perfil)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.visitaId").value(70))
					.andExpect(jsonPath("$.status").value("REALIZADA"))
					.andExpect(jsonPath("$.itens[0].resultado").value("PA 120x80"))
					.andExpect(jsonPath("$.itens[1].resultado").isEmpty());
		}
	}

	@Test
	void registrarUsaOResponsavelDoToken() throws Exception {
		when(servico.registrar(eq(70L), any(ResultadosRequest.class), eq(3L))).thenReturn(resposta());

		mvc.perform(put("/visitas/70/resultados").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"itens\": [{\"atividadeId\": 40, \"resultado\": \"PA 120x80\"}]}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.itens[0].registradoPor").value("Carlos"));
		verify(servico).registrar(70L,
				new ResultadosRequest(List.of(new ResultadosRequest.Item(40L, "PA 120x80", null))), 3L);
	}

	@Test
	void corpoSemItensOuSemResultadoRetorna400() throws Exception {
		mvc.perform(put("/visitas/70/resultados").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"itens\": []}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		mvc.perform(put("/visitas/70/resultados").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"itens\": [{\"atividadeId\": 40, \"resultado\": \"  \"}]}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		verifyNoInteractions(servico);
	}

	@Test
	void visitaNaoRealizadaRetorna409() throws Exception {
		when(servico.registrar(eq(70L), any(), eq(3L))).thenThrow(new RegraNegocioException("VISITA_NAO_REALIZADA",
				"Só é possível registrar resultados de uma visita realizada", HttpStatus.CONFLICT));

		mvc.perform(put("/visitas/70/resultados").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"itens\": [{\"atividadeId\": 40, \"resultado\": \"PA 120x80\"}]}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_NAO_REALIZADA"));
	}

	@Test
	void soOCoordenadorRegistraEOParticipanteNaoConsulta() throws Exception {
		for (String perfil : List.of("PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE")) {
			mvc.perform(put("/visitas/70/resultados").with(como(perfil)).contentType(MediaType.APPLICATION_JSON)
					.content("{\"itens\": [{\"atividadeId\": 40, \"resultado\": \"PA 120x80\"}]}"))
					.andExpect(status().isForbidden());
		}
		mvc.perform(get("/visitas/70/resultados").with(como("PARTICIPANTE"))).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRetorna401() throws Exception {
		mvc.perform(get("/visitas/70/resultados")).andExpect(status().isUnauthorized());
	}

	private static RequestPostProcessor como(String perfil) {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
	}

	private static ResultadosResponse resposta() {
		return new ResultadosResponse(70L, StatusVisita.REALIZADA, List.of(
				new ResultadosResponse.Item(40L, 1, "Aferir pressão arterial", "PA 120x80", null,
						LocalDateTime.of(2026, 12, 1, 10, 15), "Carlos"),
				new ResultadosResponse.Item(41L, 2, "Coletar glicemia", null, null, null, null)));
	}

}
