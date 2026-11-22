package clinicalstudypb.candidato;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
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
import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.candidato.dto.RetiradaRequest;
import clinicalstudypb.candidato.dto.RetiradaResponse;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;

// Task 3768: rota da retirada, formato de resposta, validação do motivo e perfil
@WebMvcTest(RetiradaController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class RetiradaControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private RetiradaService servico;

	@Test
	void retirarUsaOResponsavelDoTokenERetornaAsVagas() throws Exception {
		when(servico.retirar(eq(5L), any(RetiradaRequest.class), eq(3L))).thenReturn(resposta());

		mvc.perform(post("/candidatos/5/retirada").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"motivo\": \"Mudou de cidade\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.candidato.status").value("RETIRADO"))
				.andExpect(jsonPath("$.candidato.retirada.registradaPor").value("Carlos"))
				.andExpect(jsonPath("$.candidato.retirada.motivo").value("Mudou de cidade"))
				.andExpect(jsonPath("$.visitasCanceladas").value(2))
				.andExpect(jsonPath("$.vagasOcupadas").value(3))
				.andExpect(jsonPath("$.limiteParticipantes").value(10));
		verify(servico).retirar(5L, new RetiradaRequest("Mudou de cidade"), 3L);
	}

	@Test
	void semMotivoRetorna400() throws Exception {
		for (String corpo : List.of("{}", "{\"motivo\": \"  \"}", "{\"motivo\": \"%s\"}".formatted("x".repeat(501)))) {
			mvc.perform(post("/candidatos/5/retirada").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
					.content(corpo))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detalhes[0].campo").value("motivo"));
		}
		verifyNoInteractions(servico);
	}

	@Test
	void jaRetiradoRetorna409() throws Exception {
		when(servico.retirar(eq(5L), any(), eq(3L))).thenThrow(new RegraNegocioException("PARTICIPANTE_JA_RETIRADO",
				"Este participante já foi retirado do estudo", HttpStatus.CONFLICT));

		mvc.perform(post("/candidatos/5/retirada").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"motivo\": \"Mudou de cidade\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_JA_RETIRADO"));
	}

	@Test
	void soOCoordenadorRetira() throws Exception {
		for (String perfil : List.of("PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE")) {
			mvc.perform(post("/candidatos/5/retirada").with(como(perfil)).contentType(MediaType.APPLICATION_JSON)
					.content("{\"motivo\": \"Mudou de cidade\"}"))
					.andExpect(status().isForbidden());
		}
		mvc.perform(post("/candidatos/5/retirada").contentType(MediaType.APPLICATION_JSON)
				.content("{\"motivo\": \"Mudou de cidade\"}"))
				.andExpect(status().isUnauthorized());
		verifyNoInteractions(servico);
	}

	private static RequestPostProcessor como(String perfil) {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
	}

	private static RetiradaResponse resposta() {
		CandidatoResponse candidato = new CandidatoResponse(5L, 1L, "João Silva", "joao@teste.com", null,
				LocalDate.of(1990, 5, 20), StatusCandidato.RETIRADO, null, LocalDate.of(2026, 11, 1), true,
				new CandidatoResponse.Retirada(LocalDateTime.of(2026, 12, 10, 16, 30), "Carlos", "Mudou de cidade"));
		return new RetiradaResponse(candidato, 2, 3L, 10);
	}

}
