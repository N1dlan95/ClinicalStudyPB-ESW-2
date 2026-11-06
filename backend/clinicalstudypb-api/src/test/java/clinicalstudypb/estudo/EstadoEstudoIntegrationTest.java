package clinicalstudypb.estudo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

@SpringBootTest
@AutoConfigureMockMvc
class EstadoEstudoIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private EstudoRepository estudos;

	@Autowired
	private JdbcTemplate jdbc;

	private Usuario pesquisadora;
	private Long estudoId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		pesquisadora = usuarios.save(new Usuario("Pesquisadora RF07", "pesquisadora." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo RF07", "Objetivo do teste de estados",
				pesquisadora, LocalDate.now(), null, 10));
		estudoId = estudo.getId();
	}

	@AfterEach
	void limparDados() {
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id = ?", pesquisadora.getId());
	}

	@Test
	void transicaoValidaPersisteNoBancoReal() throws Exception {
		mvc.perform(comToken(patch("/estudos/" + estudoId + "/estado").contentType(MediaType.APPLICATION_JSON)
				.content("{\"estado\":\"RECRUTAMENTO\"}")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("RECRUTAMENTO"));

		assertThat(estudos.findById(estudoId).orElseThrow().getEstado()).isEqualTo(EstadoEstudo.RECRUTAMENTO);
	}

	@Test
	void transicaoInvalidaRetorna409SemPersistirMudanca() throws Exception {
		mvc.perform(comToken(patch("/estudos/" + estudoId + "/estado").contentType(MediaType.APPLICATION_JSON)
				.content("{\"estado\":\"EXECUCAO\"}")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("TRANSICAO_ESTADO_INVALIDA"));

		assertThat(estudos.findById(estudoId).orElseThrow().getEstado()).isEqualTo(EstadoEstudo.PLANEJAMENTO);
	}

	private MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(pesquisadora).valor());
	}
}
