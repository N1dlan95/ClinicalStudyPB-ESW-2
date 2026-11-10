package clinicalstudypb.criterio;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

import com.jayway.jsonpath.JsonPath;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3570: critérios de inclusão e exclusão (RF05) no banco real, com as regras de perfil,
// de estado do estudo e de critério já usado em avaliação. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class CriterioIntegrationTest {

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
	private Usuario coordenador;
	private Usuario administrador;
	private Long estudoId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		pesquisadora = usuarios.save(new Usuario("Pesquisadora RF05", "pesq." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		coordenador = usuarios.save(new Usuario("Coordenador RF05", "coord." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		administrador = usuarios.save(new Usuario("Administrador RF05", "adm." + sufixo + "@clinical.test", null,
				Perfil.ADMINISTRADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo RF05", "Objetivo do teste de integração", pesquisadora,
				LocalDate.now(), null, 10));
		estudoId = estudo.getId();
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração.
	// O candidato sai primeiro porque a avaliação dele aponta para o critério.
	@AfterEach
	void limparDados() {
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from criterio where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?, ?)", pesquisadora.getId(), coordenador.getId(),
				administrador.getId());
	}

	// ---- Fluxo feliz

	@Test
	void pesquisadorCadastraEditaListaERemoveCriterios() throws Exception {
		Long idade = criarPelaApi("INCLUSAO", "Idade entre 18 e 65 anos");
		criarPelaApi("INCLUSAO", "Diagnóstico confirmado");
		criarPelaApi("EXCLUSAO", "Gestante");

		mvc.perform(como(pesquisadora, put(criterios() + "/" + idade))
				.contentType(MediaType.APPLICATION_JSON)
				.content(corpo("INCLUSAO", "Idade entre 18 e 60 anos", 1)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.descricao").value("Idade entre 18 e 60 anos"));

		// Inclusão primeiro, depois exclusão; dentro de cada tipo, pela ordem
		mvc.perform(como(pesquisadora, get(criterios())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(3))
				.andExpect(jsonPath("$[0].tipo").value("INCLUSAO"))
				.andExpect(jsonPath("$[0].ordem").value(1))
				.andExpect(jsonPath("$[1].tipo").value("INCLUSAO"))
				.andExpect(jsonPath("$[1].ordem").value(2))
				.andExpect(jsonPath("$[2].tipo").value("EXCLUSAO"))
				.andExpect(jsonPath("$[2].ordem").value(1));

		mvc.perform(como(pesquisadora, delete(criterios() + "/" + idade)))
				.andExpect(status().isNoContent());
		mvc.perform(como(pesquisadora, get(criterios())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2));
	}

	// ---- Perfis

	@Test
	void coordenadorEAdministradorConsultamMasNaoAlteram() throws Exception {
		Long criterioId = criarPelaApi("INCLUSAO", "Idade entre 18 e 65 anos");

		for (Usuario usuario : new Usuario[] { coordenador, administrador }) {
			mvc.perform(como(usuario, get(criterios())))
					.andExpect(status().isOk());
			mvc.perform(como(usuario, post(criterios()))
					.contentType(MediaType.APPLICATION_JSON).content(corpo("EXCLUSAO", "Gestante", null)))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
			mvc.perform(como(usuario, put(criterios() + "/" + criterioId))
					.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Outro texto", 1)))
					.andExpect(status().isForbidden());
			mvc.perform(como(usuario, delete(criterios() + "/" + criterioId)))
					.andExpect(status().isForbidden());
		}
	}

	@Test
	void semTokenRecebe401() throws Exception {
		mvc.perform(get(criterios()))
				.andExpect(status().isUnauthorized());
		mvc.perform(post(criterios()).contentType(MediaType.APPLICATION_JSON).content(corpo("EXCLUSAO", "Gestante", null)))
				.andExpect(status().isUnauthorized());
	}

	// ---- Validação

	@Test
	void dadosInvalidosRetornam400ApontandoOCampo() throws Exception {
		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "ab", null)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("descricao"));
		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Idade mínima", 0)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("ordem"));
		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content("{\"descricao\": \"Sem tipo\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("tipo"));
	}

	// ---- Regras de negócio

	@Test
	void ordemRepetidaNoMesmoTipoRetorna409() throws Exception {
		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Idade entre 18 e 65 anos", 1)))
				.andExpect(status().isCreated());

		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Diagnóstico confirmado", 1)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ORDEM_DUPLICADA"));
		// Em outro tipo, a mesma ordem é aceita
		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("EXCLUSAO", "Gestante", 1)))
				.andExpect(status().isCreated());
	}

	@Test
	void estudoForaDoPlanejamentoNaoAceitaAlteracaoMasContinuaListando() throws Exception {
		Long criterioId = criarPelaApi("INCLUSAO", "Idade entre 18 e 65 anos");
		definirEstado("RECRUTAMENTO");

		mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("EXCLUSAO", "Gestante", null)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DO_PLANEJAMENTO"));
		mvc.perform(como(pesquisadora, put(criterios() + "/" + criterioId))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Outro texto", 1)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DO_PLANEJAMENTO"));
		mvc.perform(como(pesquisadora, delete(criterios() + "/" + criterioId)))
				.andExpect(status().isConflict());
		mvc.perform(como(pesquisadora, get(criterios())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void criterioUsadoEmAvaliacaoNaoPodeSerRemovido() throws Exception {
		Long criterioId = criarPelaApi("INCLUSAO", "Idade entre 18 e 65 anos");
		definirEstado("RECRUTAMENTO");
		Long candidatoId = cadastrarCandidato("usado@teste.com");
		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"respostas\": [{\"criterioId\": %d, \"atende\": true}]}".formatted(criterioId)))
				.andExpect(status().isOk());
		// Volta ao planejamento direto no banco, só para chegar na regra do critério em uso
		definirEstado("PLANEJAMENTO");

		mvc.perform(como(pesquisadora, delete(criterios() + "/" + criterioId)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CRITERIO_EM_USO"));
	}

	@Test
	void estudoOuCriterioInexistenteRetorna404() throws Exception {
		mvc.perform(como(pesquisadora, get("/estudos/999999999/criterios")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
		mvc.perform(como(pesquisadora, put(criterios() + "/999999999"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo("INCLUSAO", "Idade mínima", 1)))
				.andExpect(status().isNotFound());
		mvc.perform(como(pesquisadora, delete(criterios() + "/999999999")))
				.andExpect(status().isNotFound());
	}

	// ---- Apoio

	private Long criarPelaApi(String tipo, String descricao) throws Exception {
		String resposta = mvc.perform(como(pesquisadora, post(criterios()))
				.contentType(MediaType.APPLICATION_JSON).content(corpo(tipo, descricao, null)))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(resposta, "$.id")).longValue();
	}

	private Long cadastrarCandidato(String email) throws Exception {
		String resposta = mvc.perform(como(coordenador, post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome": "Candidato RF05", "email": "%s", "dataNascimento": "1990-05-20"}
						""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(resposta, "$.id")).longValue();
	}

	private String criterios() {
		return "/estudos/" + estudoId + "/criterios";
	}

	// O estado é definido direto no banco para o teste não depender da rota de mudança de estado (RF07)
	private void definirEstado(String estado) {
		jdbc.update("update estudo set estado = ? where id = ?", estado, estudoId);
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

	private static String corpo(String tipo, String descricao, Integer ordem) {
		return ordem == null
				? "{\"tipo\": \"%s\", \"descricao\": \"%s\"}".formatted(tipo, descricao)
				: "{\"tipo\": \"%s\", \"descricao\": \"%s\", \"ordem\": %d}".formatted(tipo, descricao, ordem);
	}

}
