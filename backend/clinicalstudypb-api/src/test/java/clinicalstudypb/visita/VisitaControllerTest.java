package clinicalstudypb.visita;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.visita.dto.VisitaRequest;
import clinicalstudypb.visita.dto.VisitaResponse;
import clinicalstudypb.visita.dto.VisitaStatusRequest;

// Tasks 3755/3758: rotas de visitas, formato de resposta, validação do corpo e perfis
@WebMvcTest(VisitaController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class VisitaControllerTest {

	private static final LocalDateTime DATA = LocalDateTime.of(2026, 12, 1, 9, 0);

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private VisitaService servico;

	@Test
	void agendarRetorna201ComAVisita() throws Exception {
		when(servico.agendar(eq(5L), any(VisitaRequest.class), eq(3L))).thenReturn(resposta(StatusVisita.AGENDADA));

		mvc.perform(post("/candidatos/5/visitas").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"visitaPrevistaId\": 20, \"dataHora\": \"2026-12-01T09:00:00\", \"local\": \"Sala 3\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(70))
				.andExpect(jsonPath("$.status").value("AGENDADA"))
				.andExpect(jsonPath("$.dataHora").value("2026-12-01T09:00:00"))
				.andExpect(jsonPath("$.participante.nome").value("João Silva"))
				.andExpect(jsonPath("$.visitaPrevista.nome").value("Visita de seguimento"))
				.andExpect(jsonPath("$.janela.inicio").value("2026-11-28"))
				.andExpect(jsonPath("$.janela.fim").value("2026-12-04"));
		verify(servico).agendar(5L, new VisitaRequest(20L, DATA, "Sala 3"), 3L);
	}

	@Test
	void agendarSemDataRetorna400() throws Exception {
		mvc.perform(post("/candidatos/5/visitas").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"visitaPrevistaId\": 20}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataHora"));
		verifyNoInteractions(servico);
	}

	@Test
	void dataForaDaJanelaRetorna400NoCampo() throws Exception {
		when(servico.agendar(eq(5L), any(), eq(3L)))
				.thenThrow(new ValidacaoException("dataHora", "A visita \"X\" deve ser entre 28/11/2026 e 04/12/2026"));

		mvc.perform(post("/candidatos/5/visitas").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"visitaPrevistaId\": 20, \"dataHora\": \"2026-12-10T09:00:00\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataHora"));
	}

	@Test
	void participanteNaoIncluidoRetorna409() throws Exception {
		when(servico.agendar(eq(5L), any(), eq(3L))).thenThrow(new RegraNegocioException("PARTICIPANTE_NAO_INCLUIDO",
				"Só é possível agendar visitas para participantes incluídos no estudo", HttpStatus.CONFLICT));

		mvc.perform(post("/candidatos/5/visitas").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"visitaPrevistaId\": 20, \"dataHora\": \"2026-12-01T09:00:00\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_NAO_INCLUIDO"));
	}

	@Test
	void registrarStatusUsaOResponsavelDoToken() throws Exception {
		when(servico.registrarStatus(70L, new VisitaStatusRequest(StatusVisita.REALIZADA, null), 3L))
				.thenReturn(resposta(StatusVisita.REALIZADA));

		mvc.perform(patch("/visitas/70/status").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\": \"REALIZADA\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("REALIZADA"));
	}

	@Test
	void statusDesconhecidoRetorna400() throws Exception {
		mvc.perform(patch("/visitas/70/status").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\": \"ADIADA\"}"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(servico);
	}

	@Test
	void reagendarEDetalhar() throws Exception {
		when(servico.reagendar(eq(70L), any())).thenReturn(resposta(StatusVisita.AGENDADA));
		when(servico.buscar(70L)).thenReturn(resposta(StatusVisita.AGENDADA));

		mvc.perform(put("/visitas/70").with(como("COORDENADOR")).contentType(MediaType.APPLICATION_JSON)
				.content("{\"dataHora\": \"2026-12-02T10:00:00\"}"))
				.andExpect(status().isOk());
		mvc.perform(get("/visitas/70").with(como("COORDENADOR")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(70));
	}

	@Test
	void agendaDoEstudoComFiltrosParaQuemConsultaEstudos() throws Exception {
		when(servico.listarDoEstudo(1L, StatusVisita.AGENDADA, LocalDateTime.of(2026, 12, 1, 0, 0),
				LocalDateTime.of(2026, 12, 8, 0, 0))).thenReturn(List.of(resposta(StatusVisita.AGENDADA)));

		for (String perfil : List.of("COORDENADOR", "PESQUISADOR", "ADMINISTRADOR")) {
			mvc.perform(get("/estudos/1/visitas").with(como(perfil))
					.param("status", "AGENDADA").param("de", "2026-12-01T00:00:00").param("ate", "2026-12-08T00:00:00"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.length()").value(1));
		}
	}

	@Test
	void listaDoParticipante() throws Exception {
		when(servico.listarDoParticipante(5L)).thenReturn(List.of(resposta(StatusVisita.AGENDADA)));

		mvc.perform(get("/candidatos/5/visitas").with(como("COORDENADOR")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].participante.candidatoId").value(5));
	}

	@Test
	void outrosPerfisNaoAgendamNemRegistram() throws Exception {
		for (String perfil : List.of("PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE")) {
			mvc.perform(post("/candidatos/5/visitas").with(como(perfil)).contentType(MediaType.APPLICATION_JSON)
					.content("{\"visitaPrevistaId\": 20, \"dataHora\": \"2026-12-01T09:00:00\"}"))
					.andExpect(status().isForbidden());
			mvc.perform(patch("/visitas/70/status").with(como(perfil)).contentType(MediaType.APPLICATION_JSON)
					.content("{\"status\": \"REALIZADA\"}"))
					.andExpect(status().isForbidden());
		}
		mvc.perform(get("/estudos/1/visitas").with(como("PARTICIPANTE"))).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRetorna401() throws Exception {
		mvc.perform(get("/visitas/70")).andExpect(status().isUnauthorized());
	}

	private static RequestPostProcessor como(String perfil) {
		return jwt().jwt(token -> token.subject("3")).authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
	}

	private static VisitaResponse resposta(StatusVisita status) {
		return new VisitaResponse(70L, 1L, new VisitaResponse.Participante(5L, "João Silva"),
				new VisitaResponse.VisitaPrevistaResumo(20L, 2, "Visita de seguimento"), DATA, "Sala 3", status, null,
				new VisitaResponse.Janela(LocalDate.of(2026, 11, 28), LocalDate.of(2026, 12, 4)), "Carlos", null, null);
	}

}
