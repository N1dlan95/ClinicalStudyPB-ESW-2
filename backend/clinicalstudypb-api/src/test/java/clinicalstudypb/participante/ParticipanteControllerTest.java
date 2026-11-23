package clinicalstudypb.participante;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.participante.dto.EstudoDoParticipanteResponse;
import clinicalstudypb.participante.dto.VisitaDoParticipanteResponse;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.visita.StatusVisita;

@WebMvcTest(ParticipanteController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
class ParticipanteControllerTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private ParticipanteService servico;

	@Test
	void estudosUsamOUsuarioDoTokenENoFormatoDoContrato() throws Exception {
		when(servico.estudos(40L)).thenReturn(List.of(new EstudoDoParticipanteResponse(3L, "Estudo de Controle Glicêmico",
				"Ana Pesquisadora", EstadoEstudo.EXECUCAO, LocalDate.of(2026, 11, 1), null, 7L, StatusCandidato.INCLUIDO,
				LocalDate.of(2026, 11, 20), null,
				new EstudoDoParticipanteResponse.ProximaVisita(13L, "Retorno de 30 dias", LocalDateTime.of(2026, 12, 30, 9, 0)))));

		mvc.perform(get("/participantes/me/estudos").with(participante(40L)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(3))
				.andExpect(jsonPath("$[0].responsavel").value("Ana Pesquisadora"))
				.andExpect(jsonPath("$[0].participacao").value("INCLUIDO"))
				.andExpect(jsonPath("$[0].dataInclusao").value("2026-11-20"))
				.andExpect(jsonPath("$[0].proximaVisita.dataHora").value("2026-12-30T09:00:00"));
	}

	@Test
	void visitasUsamOUsuarioDoToken() throws Exception {
		when(servico.visitas(40L)).thenReturn(List.of(new VisitaDoParticipanteResponse(12L, 3L, "Estudo de Controle Glicêmico",
				"Visita inicial", LocalDateTime.of(2026, 12, 1, 9, 0), "Sala 2", StatusVisita.REALIZADA)));

		mvc.perform(get("/participantes/me/visitas").with(participante(40L)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].estudoTitulo").value("Estudo de Controle Glicêmico"))
				.andExpect(jsonPath("$[0].dataHora").value("2026-12-01T09:00:00"))
				.andExpect(jsonPath("$[0].status").value("REALIZADA"));
	}

	@ParameterizedTest
	@EnumSource(value = Perfil.class, names = "PARTICIPANTE", mode = EnumSource.Mode.EXCLUDE)
	void outrosPerfisNaoAcessamOApp(Perfil perfil) throws Exception {
		RequestPostProcessor token = jwt().jwt(j -> j.subject("1"))
				.authorities(new SimpleGrantedAuthority("ROLE_" + perfil.name()));

		mvc.perform(get("/participantes/me/estudos").with(token)).andExpect(status().isForbidden());
		mvc.perform(get("/participantes/me/visitas").with(token)).andExpect(status().isForbidden());
		verifyNoInteractions(servico);
	}

	@Test
	void semTokenRecebe401() throws Exception {
		mvc.perform(get("/participantes/me/estudos")).andExpect(status().isUnauthorized());
	}

	private static RequestPostProcessor participante(Long usuarioId) {
		return jwt().jwt(j -> j.subject(usuarioId.toString()))
				.authorities(new SimpleGrantedAuthority("ROLE_PARTICIPANTE"));
	}

}
