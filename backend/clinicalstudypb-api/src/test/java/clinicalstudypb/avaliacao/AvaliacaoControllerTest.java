package clinicalstudypb.avaliacao;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import clinicalstudypb.avaliacao.dto.AvaliacaoRequest;
import clinicalstudypb.avaliacao.dto.AvaliacaoResponse;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.criterio.TipoCriterio;

@WebMvcTest(AvaliacaoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class AvaliacaoControllerTest {

	private static final String CORPO_VALIDO = """
			{"respostas": [
			  {"criterioId": 11, "atende": true, "observacao": "Tem 40 anos"},
			  {"criterioId": 10, "atende": false}
			]}
			""";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private AvaliacaoService servico;

	@Test
	void avaliarRegistraQuemAvaliouERetornaOResultado() throws Exception {
		when(servico.avaliar(eq(5L), any(AvaliacaoRequest.class), eq(3L))).thenReturn(resposta(StatusCandidato.ELEGIVEL));

		mvc.perform(put("/candidatos/5/avaliacao").with(coordenador()).contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VALIDO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.candidatoId").value(5))
				.andExpect(jsonPath("$.status").value("ELEGIVEL"))
				.andExpect(jsonPath("$.avaliadoPor.nome").value("Carlos Coordenador"))
				.andExpect(jsonPath("$.criterios[0].tipo").value("INCLUSAO"))
				.andExpect(jsonPath("$.criterios[0].atende").value(true))
				.andExpect(jsonPath("$.criterios[1].tipo").value("EXCLUSAO"));
	}

	@Test
	void avaliarSemRespostasRetorna400() throws Exception {
		mvc.perform(put("/candidatos/5/avaliacao").with(coordenador()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"respostas\": []}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("respostas"));
		verifyNoInteractions(servico);
	}

	@Test
	void respostaSemAtendeRetorna400ApontandoOCampo() throws Exception {
		mvc.perform(put("/candidatos/5/avaliacao").with(coordenador()).contentType(MediaType.APPLICATION_JSON)
				.content("{\"respostas\": [{\"criterioId\": 11}]}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("respostas[0].atende"))
				.andExpect(jsonPath("$.detalhes[0].mensagem").value("Informe se o candidato atende o critério"));
	}

	@Test
	void criterioFaltandoRetorna400() throws Exception {
		when(servico.avaliar(eq(5L), any(AvaliacaoRequest.class), eq(3L))).thenThrow(new ValidacaoException(
				"respostas", "Todos os critérios do estudo devem ser avaliados. Falta: Gestante"));

		mvc.perform(put("/candidatos/5/avaliacao").with(coordenador()).contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VALIDO))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].mensagem")
						.value("Todos os critérios do estudo devem ser avaliados. Falta: Gestante"));
	}

	@Test
	void estudoForaDeRecrutamentoRetorna409() throws Exception {
		when(servico.avaliar(eq(5L), any(AvaliacaoRequest.class), eq(3L))).thenThrow(new RegraNegocioException(
				"ESTUDO_FORA_DE_RECRUTAMENTO", "Só é possível avaliar candidatos com o estudo em recrutamento",
				HttpStatus.CONFLICT));

		mvc.perform(put("/candidatos/5/avaliacao").with(coordenador()).contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VALIDO))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	@Test
	void consultarRetornaOsCriteriosDoEstudo() throws Exception {
		when(servico.consultar(5L)).thenReturn(resposta(StatusCandidato.CADASTRADO));

		mvc.perform(get("/candidatos/5/avaliacao").with(coordenador()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.criterios.length()").value(2));
	}

	@Test
	void consultarCandidatoInexistenteRetorna404() throws Exception {
		when(servico.consultar(99L)).thenThrow(new RecursoNaoEncontradoException("Candidato não encontrado"));

		mvc.perform(get("/candidatos/99/avaliacao").with(coordenador()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void pesquisadorNaoAvaliaCandidatos() throws Exception {
		mvc.perform(put("/candidatos/5/avaliacao")
				.with(jwt().jwt(token -> token.subject("2")).authorities(new SimpleGrantedAuthority("ROLE_PESQUISADOR")))
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	// Token de um coordenador com id 3 (o id vira o "avaliado por")
	private static RequestPostProcessor coordenador() {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_COORDENADOR"));
	}

	private static AvaliacaoResponse resposta(StatusCandidato status) {
		return new AvaliacaoResponse(5L, status, LocalDateTime.of(2026, 11, 4, 15, 30),
				new AvaliacaoResponse.Avaliador(3L, "Carlos Coordenador"),
				List.of(new AvaliacaoResponse.Item(11L, TipoCriterio.INCLUSAO, "Idade entre 18 e 65 anos", 1, true,
						"Tem 40 anos"),
						new AvaliacaoResponse.Item(10L, TipoCriterio.EXCLUSAO, "Gestante", 1, false, null)));
	}

}
