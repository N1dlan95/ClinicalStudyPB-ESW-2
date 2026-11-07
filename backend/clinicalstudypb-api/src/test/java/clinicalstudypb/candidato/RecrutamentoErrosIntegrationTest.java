package clinicalstudypb.candidato;

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
import clinicalstudypb.criterio.Criterio;
import clinicalstudypb.criterio.CriterioRepository;
import clinicalstudypb.criterio.TipoCriterio;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3570: erros principais de RF08 a RF11 no banco real: 403 por perfil, 401 sem token, 400 de validação,
// 404 de candidato inexistente e os 409 que o RecrutamentoIntegrationTest ainda não cobre.
@SpringBootTest
@AutoConfigureMockMvc
class RecrutamentoErrosIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private EstudoRepository estudos;

	@Autowired
	private CriterioRepository criterios;

	@Autowired
	private JdbcTemplate jdbc;

	private Usuario coordenador;
	private Usuario pesquisadora;
	private Usuario administrador;
	private Usuario participante;
	private Long estudoId;
	private Criterio idade;
	private Long candidatoId;

	@BeforeEach
	void prepararDados() throws Exception {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Erros", "coord." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Erros", "pesq." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		administrador = usuarios.save(new Usuario("Administrador Erros", "adm." + sufixo + "@clinical.test", null,
				Perfil.ADMINISTRADOR, "hash"));
		participante = usuarios.save(new Usuario("Participante Erros", "part." + sufixo + "@clinical.test", null,
				Perfil.PARTICIPANTE, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de erros do recrutamento", "Objetivo do teste de integração",
				pesquisadora, LocalDate.now(), null, 1));
		estudoId = estudo.getId();
		definirEstado("RECRUTAMENTO");
		idade = criterios.save(new Criterio(estudo, TipoCriterio.INCLUSAO, "Idade entre 18 e 65 anos", 1));
		candidatoId = cadastrarPelaApi("base@teste.com");
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from criterio where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?, ?, ?)", coordenador.getId(), pesquisadora.getId(),
				administrador.getId(), participante.getId());
	}

	// ---- Perfis (RF03 aplicado a RF08 a RF11)

	@Test
	void somenteOCoordenadorAcessaAsRotasDoRecrutamento() throws Exception {
		for (Usuario usuario : new Usuario[] { pesquisadora, administrador, participante }) {
			mvc.perform(como(usuario, get("/estudos/" + estudoId + "/candidatos")))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
			mvc.perform(como(usuario, post("/estudos/" + estudoId + "/candidatos"))
					.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato("outro@teste.com", "1990-05-20")))
					.andExpect(status().isForbidden());
			mvc.perform(como(usuario, put("/candidatos/" + candidatoId + "/avaliacao"))
					.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
					.andExpect(status().isForbidden());
			mvc.perform(como(usuario, post("/candidatos/" + candidatoId + "/consentimento")))
					.andExpect(status().isForbidden());
			mvc.perform(como(usuario, post("/candidatos/" + candidatoId + "/inclusao")))
					.andExpect(status().isForbidden());
		}
	}

	@Test
	void semTokenRecebe401() throws Exception {
		mvc.perform(get("/estudos/" + estudoId + "/candidatos"))
				.andExpect(status().isUnauthorized());
		mvc.perform(post("/candidatos/" + candidatoId + "/inclusao"))
				.andExpect(status().isUnauthorized());
	}

	// ---- Validação (400)

	@Test
	void candidatoComDadosInvalidosRetorna400ApontandoOCampo() throws Exception {
		mvc.perform(como(coordenador, post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato("email-invalido", "1990-05-20")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value("email"));
		String amanha = LocalDate.now().plusDays(1).toString();
		mvc.perform(como(coordenador, post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato("futuro@teste.com", amanha)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataNascimento"));
	}

	@Test
	void avaliacaoSemRespostasRetorna400() throws Exception {
		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content("{\"respostas\": []}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("respostas"));
	}

	// ---- Não encontrado (404)

	@Test
	void candidatoInexistenteRetorna404() throws Exception {
		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/candidatos/999999999")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
		mvc.perform(como(coordenador, get("/candidatos/999999999/avaliacao")))
				.andExpect(status().isNotFound());
		mvc.perform(como(coordenador, post("/candidatos/999999999/consentimento")))
				.andExpect(status().isNotFound());
		mvc.perform(como(coordenador, post("/candidatos/999999999/inclusao")))
				.andExpect(status().isNotFound());
	}

	// ---- Regras de negócio (409)

	@Test
	void candidatoNaoAvaliadoOuInelegivelNaoEIncluido() throws Exception {
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_NAO_ELEGIVEL"));

		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(false)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INELEGIVEL"));
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_NAO_ELEGIVEL"));
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_NAO_ELEGIVEL"));
	}

	@Test
	void estudoQueSaiuDoRecrutamentoBloqueiaAvaliacaoEInclusao() throws Exception {
		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
				.andExpect(status().isOk());
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isOk());
		definirEstado("EXECUCAO");

		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DE_RECRUTAMENTO"));
		Long outro = inserirCandidatoDireto("outro@teste.com");
		mvc.perform(como(coordenador, put("/candidatos/" + outro + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	@Test
	void candidatoJaIncluidoNaoEReavaliadoNemIncluidoDeNovo() throws Exception {
		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
				.andExpect(status().isOk());
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isOk());
		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.vagasOcupadas").value(1));

		mvc.perform(como(coordenador, post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_JA_INCLUIDO"));
		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_JA_INCLUIDO"));
	}

	@Test
	void estudoSemCriterioDeInclusaoNaoPermiteAvaliar() throws Exception {
		jdbc.update("delete from criterio where estudo_id = ?", estudoId);

		mvc.perform(como(coordenador, put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON).content(respostaIdade(true)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_SEM_CRITERIOS_DE_INCLUSAO"));
	}

	// ---- Apoio

	private Long cadastrarPelaApi(String email) throws Exception {
		String resposta = mvc.perform(como(coordenador, post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato(email, "1990-05-20")))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(resposta, "$.id")).longValue();
	}

	// Com o estudo fora do recrutamento a API não cadastra candidato, então este entra direto no banco
	private Long inserirCandidatoDireto(String email) {
		return jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status)
				values (?, 'Candidato direto', ?, date '1990-05-20', 'CADASTRADO') returning id
				""", Long.class, estudoId, email);
	}

	private String respostaIdade(boolean atende) {
		return "{\"respostas\": [{\"criterioId\": %d, \"atende\": %b}]}".formatted(idade.getId(), atende);
	}

	private void definirEstado(String estado) {
		jdbc.update("update estudo set estado = ? where id = ?", estado, estudoId);
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

	private static String corpoCandidato(String email, String dataNascimento) {
		return """
				{"nome": "Candidato de teste", "email": "%s", "dataNascimento": "%s"}
				""".formatted(email, dataNascimento);
	}

}
