package clinicalstudypb.estudo;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import com.jayway.jsonpath.JsonPath;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3236: cadastro de estudos (RF04) de ponta a ponta no banco real: criar, editar, buscar e listar,
// as regras de datas, limite e responsável, e o acesso por perfil. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class EstudoIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private JdbcTemplate jdbc;

	private String sufixo;
	private Usuario pesquisadora;
	private Usuario coordenador;
	private Usuario administrador;
	private Usuario participante;

	@BeforeEach
	void prepararDados() {
		sufixo = UUID.randomUUID().toString();
		pesquisadora = usuarios.save(new Usuario("Pesquisadora RF04", "pesq." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		coordenador = usuarios.save(new Usuario("Coordenador RF04", "coord." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		administrador = usuarios.save(new Usuario("Administrador RF04", "adm." + sufixo + "@clinical.test", null,
				Perfil.ADMINISTRADOR, "hash"));
		participante = usuarios.save(new Usuario("Participante RF04", "part." + sufixo + "@clinical.test", null,
				Perfil.PARTICIPANTE, "hash"));
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from estudo where responsavel_id = ?", pesquisadora.getId());
		jdbc.update("delete from usuario where id in (?, ?, ?, ?)", pesquisadora.getId(), coordenador.getId(),
				administrador.getId(), participante.getId());
	}

	// ---- Fluxo feliz

	@Test
	void pesquisadorCadastraEditaEConsultaUmEstudo() throws Exception {
		String resposta = mvc.perform(como(pesquisadora, post("/estudos"))
				.contentType(MediaType.APPLICATION_JSON)
				.content(corpo("  Estudo " + sufixo + "  ", "2026-11-10", "2027-05-10", 30)))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", startsWith("/api/estudos/")))
				.andExpect(jsonPath("$.titulo").value("Estudo " + sufixo))
				.andExpect(jsonPath("$.estado").value("PLANEJAMENTO"))
				.andExpect(jsonPath("$.responsavel.id").value(pesquisadora.getId()))
				.andExpect(jsonPath("$.limiteParticipantes").value(30))
				.andReturn().getResponse().getContentAsString();
		Long id = ((Number) JsonPath.read(resposta, "$.id")).longValue();

		mvc.perform(como(pesquisadora, put("/estudos/" + id))
				.contentType(MediaType.APPLICATION_JSON)
				.content(corpo("Estudo " + sufixo + " revisado", "2026-11-10", null, 40)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.titulo").value("Estudo " + sufixo + " revisado"))
				.andExpect(jsonPath("$.dataFim").isEmpty())
				.andExpect(jsonPath("$.limiteParticipantes").value(40))
				.andExpect(jsonPath("$.estado").value("PLANEJAMENTO"));

		mvc.perform(como(pesquisadora, get("/estudos/" + id)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.titulo").value("Estudo " + sufixo + " revisado"))
				.andExpect(jsonPath("$.responsavel.nome").value("Pesquisadora RF04"));
	}

	@Test
	void listagemFiltraPorTituloEPorEstado() throws Exception {
		Long primeiro = criarPelaApi("Estudo A " + sufixo);
		criarPelaApi("Estudo B " + sufixo);
		jdbc.update("update estudo set estado = 'RECRUTAMENTO' where id = ?", primeiro);

		mvc.perform(como(pesquisadora, get("/estudos").param("busca", sufixo.toUpperCase())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(2));
		mvc.perform(como(pesquisadora, get("/estudos").param("busca", sufixo).param("estado", "RECRUTAMENTO")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].id").value(primeiro));
		mvc.perform(como(pesquisadora, get("/estudos").param("size", "101")))
				.andExpect(status().isBadRequest());
	}

	// ---- Perfis

	@Test
	void coordenadorEAdministradorConsultamMasNaoCadastramNemEditam() throws Exception {
		Long id = criarPelaApi("Estudo perfis " + sufixo);

		for (Usuario usuario : new Usuario[] { coordenador, administrador }) {
			mvc.perform(como(usuario, get("/estudos").param("busca", sufixo)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.totalElements").value(1));
			mvc.perform(como(usuario, get("/estudos/" + id)))
					.andExpect(status().isOk());
			mvc.perform(como(usuario, post("/estudos"))
					.contentType(MediaType.APPLICATION_JSON).content(corpo("Outro estudo", "2026-11-10", null, 10)))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
			mvc.perform(como(usuario, put("/estudos/" + id))
					.contentType(MediaType.APPLICATION_JSON).content(corpo("Outro estudo", "2026-11-10", null, 10)))
					.andExpect(status().isForbidden());
		}
	}

	@Test
	void participanteNaoAcessaEstudosESemTokenRecebe401() throws Exception {
		mvc.perform(como(participante, get("/estudos")))
				.andExpect(status().isForbidden());
		mvc.perform(get("/estudos"))
				.andExpect(status().isUnauthorized());
		mvc.perform(post("/estudos").contentType(MediaType.APPLICATION_JSON)
				.content(corpo("Sem token", "2026-11-10", null, 10)))
				.andExpect(status().isUnauthorized());
	}

	// ---- Validação (datas, limite e responsável)

	@Test
	void limiteDeParticipantesPrecisaSerMaiorQueZero() throws Exception {
		for (int limite : new int[] { 0, -5 }) {
			mvc.perform(como(pesquisadora, post("/estudos"))
					.contentType(MediaType.APPLICATION_JSON).content(corpo("Estudo limite", "2026-11-10", null, limite)))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detalhes[0].campo").value("limiteParticipantes"));
		}
	}

	@Test
	void dataDeTerminoNaoPodeSerAnteriorAoInicio() throws Exception {
		mvc.perform(como(pesquisadora, post("/estudos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("Estudo datas", "2026-11-10", "2026-11-09", 10)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataFim"));
		// Terminar no mesmo dia do início é permitido
		mvc.perform(como(pesquisadora, post("/estudos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("Estudo datas", "2026-11-10", "2026-11-10", 10)))
				.andExpect(status().isCreated());
	}

	@Test
	void responsavelPrecisaSerPesquisadorAtivo() throws Exception {
		mvc.perform(como(pesquisadora, post("/estudos"))
				.contentType(MediaType.APPLICATION_JSON)
				.content(corpo("Estudo responsável", "2026-11-10", null, 10, coordenador.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("responsavelId"));

		Usuario inativo = usuarios.save(new Usuario("Pesquisador inativo", "inativo." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		try {
			jdbc.update("update usuario set ativo = false where id = ?", inativo.getId());
			mvc.perform(como(pesquisadora, post("/estudos"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(corpo("Estudo responsável", "2026-11-10", null, 10, inativo.getId())))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.detalhes[0].campo").value("responsavelId"));
		}
		finally {
			jdbc.update("delete from usuario where id = ?", inativo.getId());
		}
	}

	// ---- Regras de negócio e não encontrado

	@Test
	void estudoEncerradoNaoPodeSerEditado() throws Exception {
		Long id = criarPelaApi("Estudo encerrado " + sufixo);
		jdbc.update("update estudo set estado = 'ENCERRADO' where id = ?", id);

		mvc.perform(como(pesquisadora, put("/estudos/" + id))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("Novo título", "2026-11-10", null, 10)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_ENCERRADO"));
	}

	@Test
	void estudoInexistenteRetorna404() throws Exception {
		mvc.perform(como(pesquisadora, get("/estudos/999999999")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
		mvc.perform(como(pesquisadora, put("/estudos/999999999"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("Estudo", "2026-11-10", null, 10)))
				.andExpect(status().isNotFound());
	}

	// ---- Apoio

	private Long criarPelaApi(String titulo) throws Exception {
		String resposta = mvc.perform(como(pesquisadora, post("/estudos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo(titulo, "2026-11-10", null, 10)))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(resposta, "$.id")).longValue();
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

	private String corpo(String titulo, String dataInicio, String dataFim, int limite) {
		return corpo(titulo, dataInicio, dataFim, limite, pesquisadora.getId());
	}

	private static String corpo(String titulo, String dataInicio, String dataFim, int limite, Long responsavelId) {
		String fim = dataFim == null ? "null" : "\"" + dataFim + "\"";
		return """
				{"titulo": "%s", "objetivo": "Objetivo do teste de integração", "responsavelId": %d,
				 "dataInicio": "%s", "dataFim": %s, "limiteParticipantes": %d}
				""".formatted(titulo, responsavelId, dataInicio, fim, limite);
	}

}
