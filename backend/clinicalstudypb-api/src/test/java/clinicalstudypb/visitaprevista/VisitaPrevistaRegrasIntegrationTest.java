package clinicalstudypb.visitaprevista;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
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
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3570: erros principais das visitas previstas (RF06) no banco real: validação, 404, ordem repetida,
// estudo encerrado e perfil participante. O fluxo feliz e o 403 de coordenador e administrador
// estão no VisitaPrevistaIntegrationTest.
@SpringBootTest
@AutoConfigureMockMvc
class VisitaPrevistaRegrasIntegrationTest {

	private static final String CORPO_VISITA = """
			{"ordem":%d,"nome":"Visita de triagem","diaPrevisto":0,"janelaDias":2,
			 "descricao":"Avaliação inicial","atividades":[{"ordem":1,"descricao":"Coleta de sangue"}]}
			""";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private EstudoRepository estudos;

	@Autowired
	private VisitaPrevistaRepository visitas;

	@Autowired
	private JdbcTemplate jdbc;

	private Usuario pesquisadora;
	private Usuario participante;
	private Long estudoId;
	private Long visitaId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		pesquisadora = usuarios.save(new Usuario("Pesquisadora RF06", "pesq." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		participante = usuarios.save(new Usuario("Participante RF06", "part." + sufixo + "@clinical.test", null,
				Perfil.PARTICIPANTE, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo RF06 regras", "Objetivo do teste de integração",
				pesquisadora, LocalDate.now(), null, 10));
		estudoId = estudo.getId();

		VisitaPrevista visita = new VisitaPrevista(estudo, 1, "Visita de triagem", 0, 2, "Avaliação inicial");
		visita.substituirAtividades(List.of(new Atividade(1, "Coleta de sangue")));
		visitaId = visitas.saveAndFlush(visita).getId();
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?)", pesquisadora.getId(), participante.getId());
	}

	@Test
	void dadosInvalidosRetornam400ApontandoOCampo() throws Exception {
		mvc.perform(comoPesquisadora(post(visitasPrevistas()))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ordem\":2,\"nome\":\"ab\",\"diaPrevisto\":0}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("nome"));
		mvc.perform(comoPesquisadora(post(visitasPrevistas()))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ordem\":2,\"nome\":\"Visita de retorno\",\"diaPrevisto\":-1}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("diaPrevisto"));
	}

	@Test
	void ordemDeVisitaRepetidaNoEstudoRetorna409() throws Exception {
		mvc.perform(comoPesquisadora(post(visitasPrevistas()))
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA.formatted(1)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ORDEM_DUPLICADA"));
	}

	@Test
	void ordemDeAtividadeRepetidaNaVisitaRetorna409() throws Exception {
		mvc.perform(comoPesquisadora(post(visitasPrevistas()))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"ordem":2,"nome":"Visita de retorno","diaPrevisto":30,
						 "atividades":[{"ordem":1,"descricao":"Coleta de sangue"},{"ordem":1,"descricao":"Pressão"}]}
						"""))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ORDEM_DUPLICADA"));
	}

	@Test
	void estudoEncerradoNaoAceitaAlteracaoMasContinuaListando() throws Exception {
		jdbc.update("update estudo set estado = 'ENCERRADO' where id = ?", estudoId);

		mvc.perform(comoPesquisadora(post(visitasPrevistas()))
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA.formatted(2)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_ENCERRADO"));
		mvc.perform(comoPesquisadora(put(visitasPrevistas() + "/" + visitaId))
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA.formatted(1)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_ENCERRADO"));
		mvc.perform(comoPesquisadora(delete(visitasPrevistas() + "/" + visitaId)))
				.andExpect(status().isConflict());
		mvc.perform(comoPesquisadora(get(visitasPrevistas())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void estudoOuVisitaInexistenteRetorna404() throws Exception {
		mvc.perform(comoPesquisadora(get("/estudos/999999999/visitas-previstas")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
		mvc.perform(comoPesquisadora(put(visitasPrevistas() + "/999999999"))
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA.formatted(1)))
				.andExpect(status().isNotFound());
		mvc.perform(comoPesquisadora(delete(visitasPrevistas() + "/999999999")))
				.andExpect(status().isNotFound());
	}

	@Test
	void participanteNaoAcessaVisitasPrevistas() throws Exception {
		mvc.perform(get(visitasPrevistas())
				.header("Authorization", "Bearer " + tokens.gerar(participante).valor()))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
	}

	private String visitasPrevistas() {
		return "/estudos/" + estudoId + "/visitas-previstas";
	}

	private MockHttpServletRequestBuilder comoPesquisadora(MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(pesquisadora).valor());
	}

}
