package clinicalstudypb.candidato;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;

@WebMvcTest(ConsentimentoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class ConsentimentoControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ConsentimentoService servico;

	@Test
	void registrarRetornaOCandidatoNoFormatoEsperadoPeloFront() throws Exception {
		when(servico.registrar(5L, 3L)).thenReturn(new CandidatoResponse(5L, 1L, "João Silva", "joao@teste.com", null,
				LocalDate.of(1990, 5, 20), StatusCandidato.ELEGIVEL,
				new CandidatoResponse.Consentimento(LocalDateTime.of(2026, 11, 5, 15, 30), "Carlos Coordenador"),
				null));

		mvc.perform(post("/candidatos/5/consentimento").with(coordenador()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ELEGIVEL"))
				.andExpect(jsonPath("$.consentimento.registradoEm").value("2026-11-05T15:30:00"))
				.andExpect(jsonPath("$.consentimento.registradoPor").value("Carlos Coordenador"));
	}

	@Test
	void consentimentoRepetidoRetorna409() throws Exception {
		when(servico.registrar(5L, 3L)).thenThrow(new RegraNegocioException("CONSENTIMENTO_JA_REGISTRADO",
				"O consentimento deste candidato já foi registrado", HttpStatus.CONFLICT));

		mvc.perform(post("/candidatos/5/consentimento").with(coordenador()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CONSENTIMENTO_JA_REGISTRADO"));
	}

	@Test
	void outroPerfilNaoRegistra() throws Exception {
		mvc.perform(post("/candidatos/5/consentimento")
				.with(jwt().jwt(token -> token.subject("2")).authorities(new SimpleGrantedAuthority("ROLE_PESQUISADOR"))))
				.andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRetorna401() throws Exception {
		mvc.perform(post("/candidatos/5/consentimento"))
				.andExpect(status().isUnauthorized());
	}

	// Token de um coordenador com id 3 (o id vira o "registrado por")
	private static RequestPostProcessor coordenador() {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_COORDENADOR"));
	}

}
