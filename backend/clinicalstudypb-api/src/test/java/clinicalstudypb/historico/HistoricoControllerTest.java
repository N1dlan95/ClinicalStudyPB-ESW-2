package clinicalstudypb.historico;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.historico.dto.HistoricoResponse;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.dto.ResultadosResponse;
import clinicalstudypb.visita.dto.VisitaResponse;

// Task 3765 (T-96): rota do histórico e perfis. Pesquisador, coordenador e administrador consultam; o participante
// não. A regra fica antes da de /candidatos/**, que continua só do coordenador.
@WebMvcTest(HistoricoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class HistoricoControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private HistoricoService servico;

	@Test
	void pesquisadorCoordenadorEAdministradorConsultam() throws Exception {
		when(servico.consultar(5L)).thenReturn(resposta());

		for (String perfil : List.of("PESQUISADOR", "COORDENADOR", "ADMINISTRADOR")) {
			mvc.perform(get("/candidatos/5/historico").with(como(perfil)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.participante.candidatoId").value(5))
					.andExpect(jsonPath("$.participante.email").value("joao@teste.com"))
					.andExpect(jsonPath("$.participante.status").value("INCLUIDO"))
					.andExpect(jsonPath("$.participante.dataInclusao").value("2026-11-02"))
					.andExpect(jsonPath("$.participante.retirada").isEmpty())
					.andExpect(jsonPath("$.estudo.titulo").value("Estudo de Controle Glicêmico"))
					.andExpect(jsonPath("$.visitas[0].visitaPrevista.nome").value("Triagem"))
					.andExpect(jsonPath("$.visitas[0].status").value("REALIZADA"))
					.andExpect(jsonPath("$.visitas[0].resultados[0].resultado").value("PA 120x80"))
					.andExpect(jsonPath("$.visitas[1].status").value("CANCELADA"))
					.andExpect(jsonPath("$.visitas[1].observacao").value("Participante viajou"))
					.andExpect(jsonPath("$.visitas[1].resultados").isEmpty());
		}
	}

	@Test
	void participanteNaoConsulta() throws Exception {
		mvc.perform(get("/candidatos/5/historico").with(como("PARTICIPANTE"))).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	// A liberação vale só para o GET do histórico: as outras rotas de /candidatos/** continuam do coordenador
	@Test
	void liberacaoNaoAbreAsOutrasRotasDeCandidatos() throws Exception {
		mvc.perform(post("/candidatos/5/historico").with(como("PESQUISADOR"))).andExpect(status().isForbidden());
		mvc.perform(get("/candidatos/5/conta").with(como("PESQUISADOR"))).andExpect(status().isForbidden());
		mvc.perform(get("/candidatos/5/visitas").with(como("ADMINISTRADOR"))).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRetorna401() throws Exception {
		mvc.perform(get("/candidatos/5/historico")).andExpect(status().isUnauthorized());
	}

	@Test
	void candidatoNaoIncluidoRetorna409EInexistente404() throws Exception {
		when(servico.consultar(6L)).thenThrow(new RegraNegocioException("PARTICIPANTE_NAO_INCLUIDO",
				"Este candidato nunca foi incluído no estudo, por isso não tem histórico", HttpStatus.CONFLICT));
		when(servico.consultar(99L)).thenThrow(new RecursoNaoEncontradoException("Candidato não encontrado"));

		mvc.perform(get("/candidatos/6/historico").with(como("PESQUISADOR")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_NAO_INCLUIDO"));
		mvc.perform(get("/candidatos/99/historico").with(como("PESQUISADOR")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	private static RequestPostProcessor como(String perfil) {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
	}

	private static HistoricoResponse resposta() {
		return new HistoricoResponse(
				new HistoricoResponse.Participante(5L, "João Silva", "joao@teste.com", StatusCandidato.INCLUIDO,
						LocalDate.of(2026, 11, 2), null),
				new HistoricoResponse.EstudoResumo(1L, "Estudo de Controle Glicêmico"),
				List.of(
						new HistoricoResponse.VisitaHistorico(70L, new VisitaResponse.VisitaPrevistaResumo(20L, 1, "Triagem"),
								LocalDateTime.of(2026, 11, 2, 9, 0), "Sala 2", StatusVisita.REALIZADA, null,
								List.of(new ResultadosResponse.Item(40L, 1, "Aferir pressão arterial", "PA 120x80", null,
										LocalDateTime.of(2026, 11, 2, 10, 15), "Carlos"))),
						new HistoricoResponse.VisitaHistorico(71L, new VisitaResponse.VisitaPrevistaResumo(21L, 2, "Retorno"),
								LocalDateTime.of(2026, 11, 20, 9, 0), null, StatusVisita.CANCELADA, "Participante viajou",
								List.of())));
	}

}
