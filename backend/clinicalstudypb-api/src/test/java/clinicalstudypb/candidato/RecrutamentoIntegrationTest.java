package clinicalstudypb.candidato;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

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
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.criterio.Criterio;
import clinicalstudypb.criterio.CriterioRepository;
import clinicalstudypb.criterio.TipoCriterio;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3568: recrutamento de ponta a ponta no banco real (RF08 a RF11), incluindo as migrações,
// as restrições do banco e as travas da inclusão. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class RecrutamentoIntegrationTest {

	private static final int LIMITE = 2;

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
	private CandidatoRepository candidatos;

	@Autowired
	private InclusaoService inclusao;

	@Autowired
	private JdbcTemplate jdbc;

	private Usuario coordenador;
	private Usuario pesquisadora;
	private Long estudoId;
	private Criterio idade;
	private Criterio gestante;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Recrutamento", "coord." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Recrutamento", "pesq." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de recrutamento", "Objetivo do teste de integração",
				pesquisadora, LocalDate.now(), null, LIMITE));
		estudoId = estudo.getId();
		definirEstado("RECRUTAMENTO");
		idade = criterios.save(new Criterio(estudo, TipoCriterio.INCLUSAO, "Idade entre 18 e 65 anos", 1));
		gestante = criterios.save(new Criterio(estudo, TipoCriterio.EXCLUSAO, "Gestante", 1));
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from criterio where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?)", coordenador.getId(), pesquisadora.getId());
	}

	// ---- Fluxo completo

	@Test
	void fluxoCompletoDoCadastroAteAInclusao() throws Exception {
		Long candidatoId = cadastrarPelaApi("joao@teste.com");

		avaliarPelaApi(candidatoId, true, false)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ELEGIVEL"))
				.andExpect(jsonPath("$.avaliadoPor.nome").value("Coordenador Recrutamento"));

		mvc.perform(comoCoordenador(post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CONSENTIMENTO_NAO_REGISTRADO"));

		registrarConsentimento(candidatoId);

		mvc.perform(comoCoordenador(post("/candidatos/" + candidatoId + "/inclusao")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.vagasOcupadas").value(1))
				.andExpect(jsonPath("$.limiteParticipantes").value(LIMITE));

		mvc.perform(comoCoordenador(get("/estudos/" + estudoId + "/candidatos/" + candidatoId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INCLUIDO"))
				.andExpect(jsonPath("$.dataInclusao").value(LocalDate.now().toString()));
	}

	// ---- Candidatos

	@Test
	void emailRepetidoNoEstudoEBloqueadoSemDiferenciarMaiusculas() throws Exception {
		cadastrarPelaApi("maria@teste.com");

		mvc.perform(comoCoordenador(post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato("MARIA@teste.com")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("EMAIL_DUPLICADO_NO_ESTUDO"));
	}

	@Test
	void cadastroComEstudoForaDeRecrutamentoEBloqueado() throws Exception {
		definirEstado("PLANEJAMENTO");

		mvc.perform(comoCoordenador(post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato("ana@teste.com")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	// ---- Elegibilidade

	@Test
	void reavaliacaoSubstituiAsRespostasAnteriores() throws Exception {
		Long candidatoId = cadastrarPelaApi("pedro@teste.com");

		avaliarPelaApi(candidatoId, false, false)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INELEGIVEL"));
		avaliarPelaApi(candidatoId, true, false)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ELEGIVEL"));

		mvc.perform(comoCoordenador(get("/candidatos/" + candidatoId + "/avaliacao")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.criterios.length()").value(2))
				.andExpect(jsonPath("$.criterios[0].tipo").value("INCLUSAO"))
				.andExpect(jsonPath("$.criterios[0].atende").value(true))
				.andExpect(jsonPath("$.avaliadoPor.id").value(coordenador.getId()));
		assertThat(jdbc.queryForObject("select count(*) from avaliacao_criterio where candidato_id = ?", Long.class,
				candidatoId)).isEqualTo(2);
	}

	@Test
	void condicaoDeExclusaoDeixaOCandidatoInelegivel() throws Exception {
		Long candidatoId = cadastrarPelaApi("carla@teste.com");

		avaliarPelaApi(candidatoId, true, true)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("INELEGIVEL"));
	}

	@Test
	void faltandoCriterioNaoAlteraOCandidato() throws Exception {
		Long candidatoId = cadastrarPelaApi("rui@teste.com");

		mvc.perform(comoCoordenador(put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"respostas\": [{\"criterioId\": %d, \"atende\": true}]}".formatted(idade.getId())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("respostas"));

		assertThat(candidatos.findById(candidatoId).orElseThrow().getStatus()).isEqualTo(StatusCandidato.CADASTRADO);
	}

	// ---- Consentimento

	@Test
	void consentimentoExigeCandidatoElegivelEValeUmaVez() throws Exception {
		Long candidatoId = cadastrarPelaApi("lia@teste.com");

		mvc.perform(comoCoordenador(post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_NAO_ELEGIVEL"));

		avaliarPelaApi(candidatoId, true, false).andExpect(status().isOk());
		registrarConsentimento(candidatoId);

		mvc.perform(comoCoordenador(post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CONSENTIMENTO_JA_REGISTRADO"));
		avaliarPelaApi(candidatoId, false, false)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CANDIDATO_COM_CONSENTIMENTO"));
	}

	@Test
	void buscaEListagemDoCandidatoTrazemOConsentimento() throws Exception {
		Long comConsentimento = candidatoProntoParaIncluir("com@teste.com");
		Long semConsentimento = cadastrarPelaApi("sem@teste.com");

		mvc.perform(comoCoordenador(get("/estudos/" + estudoId + "/candidatos/" + comConsentimento)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.consentimento.registradoEm").isNotEmpty())
				.andExpect(jsonPath("$.consentimento.registradoPor").value("Coordenador Recrutamento"));
		mvc.perform(comoCoordenador(get("/estudos/" + estudoId + "/candidatos/" + semConsentimento)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.consentimento").isEmpty());
		mvc.perform(comoCoordenador(get("/estudos/" + estudoId + "/candidatos").param("status", "ELEGIVEL")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].consentimento.registradoPor").value("Coordenador Recrutamento"));
	}

	// ---- Limite de vagas

	@Test
	void aUltimaVagaEOcupadaEDepoisAsVagasEsgotam() throws Exception {
		Long primeiro = candidatoProntoParaIncluir("c1@teste.com");
		Long segundo = candidatoProntoParaIncluir("c2@teste.com");
		Long terceiro = candidatoProntoParaIncluir("c3@teste.com");

		mvc.perform(comoCoordenador(post("/candidatos/" + primeiro + "/inclusao")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.vagasOcupadas").value(1));
		mvc.perform(comoCoordenador(post("/candidatos/" + segundo + "/inclusao")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.vagasOcupadas").value(LIMITE));
		mvc.perform(comoCoordenador(post("/candidatos/" + terceiro + "/inclusao")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VAGAS_ESGOTADAS"));

		assertThat(candidatos.findById(terceiro).orElseThrow().getStatus()).isEqualTo(StatusCandidato.ELEGIVEL);
	}

	@Test
	void inclusoesSimultaneasNaoUltrapassamOLimite() throws Exception {
		List<Long> ids = new ArrayList<>();
		for (int i = 0; i < 8; i++) {
			ids.add(candidatoProntoParaIncluir("simultaneo" + i + "@teste.com"));
		}

		List<String> resultados = executarAoMesmoTempo(ids);

		assertThat(resultados).filteredOn("OK"::equals).hasSize(LIMITE);
		assertThat(resultados).filteredOn("VAGAS_ESGOTADAS"::equals).hasSize(ids.size() - LIMITE);
		assertThat(candidatos.countByEstudoIdAndStatus(estudoId, StatusCandidato.INCLUIDO)).isEqualTo(LIMITE);
	}

	@Test
	void oMesmoCandidatoIncluidoAoMesmoTempoOcupaUmaVagaSo() throws Exception {
		Long candidatoId = candidatoProntoParaIncluir("repetido@teste.com");

		List<String> resultados = executarAoMesmoTempo(List.of(candidatoId, candidatoId, candidatoId, candidatoId));

		assertThat(resultados).filteredOn("OK"::equals).hasSize(1);
		assertThat(resultados).filteredOn("CANDIDATO_JA_INCLUIDO"::equals).hasSize(3);
		assertThat(candidatos.countByEstudoIdAndStatus(estudoId, StatusCandidato.INCLUIDO)).isEqualTo(1);
	}

	// ---- Apoio

	// Chama a inclusão em paralelo e devolve "OK" ou o código de erro de cada chamada
	private List<String> executarAoMesmoTempo(List<Long> ids) throws Exception {
		ExecutorService threads = Executors.newFixedThreadPool(ids.size());
		CountDownLatch largada = new CountDownLatch(1);
		try {
			List<Future<String>> futuros = new ArrayList<>();
			for (Long id : ids) {
				Callable<String> tarefa = () -> {
					largada.await();
					try {
						inclusao.incluir(id);
						return "OK";
					}
					catch (RegraNegocioException ex) {
						return ex.getCodigo();
					}
				};
				futuros.add(threads.submit(tarefa));
			}
			largada.countDown();
			List<String> resultados = new ArrayList<>();
			for (Future<String> futuro : futuros) {
				resultados.add(futuro.get());
			}
			return resultados;
		}
		finally {
			threads.shutdownNow();
		}
	}

	private Long cadastrarPelaApi(String email) throws Exception {
		String resposta = mvc.perform(comoCoordenador(post("/estudos/" + estudoId + "/candidatos"))
				.contentType(MediaType.APPLICATION_JSON).content(corpoCandidato(email)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("CADASTRADO"))
				.andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(resposta, "$.id")).longValue();
	}

	private org.springframework.test.web.servlet.ResultActions avaliarPelaApi(Long candidatoId, boolean atendeIdade,
			boolean gestanteAtende) throws Exception {
		return mvc.perform(comoCoordenador(put("/candidatos/" + candidatoId + "/avaliacao"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"respostas": [
						  {"criterioId": %d, "atende": %b},
						  {"criterioId": %d, "atende": %b}
						]}
						""".formatted(idade.getId(), atendeIdade, gestante.getId(), gestanteAtende)));
	}

	private Long candidatoProntoParaIncluir(String email) throws Exception {
		Long candidatoId = cadastrarPelaApi(email);
		avaliarPelaApi(candidatoId, true, false).andExpect(status().isOk());
		registrarConsentimento(candidatoId);
		return candidatoId;
	}

	private void registrarConsentimento(Long candidatoId) throws Exception {
		mvc.perform(comoCoordenador(post("/candidatos/" + candidatoId + "/consentimento")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.consentimento.registradoPor").value("Coordenador Recrutamento"));
	}

	// A mudança de estado pela API é da task 3554; aqui o estado é definido direto no banco
	private void definirEstado(String estado) {
		jdbc.update("update estudo set estado = ? where id = ?", estado, estudoId);
	}

	private MockHttpServletRequestBuilder comoCoordenador(MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(coordenador).valor());
	}

	private static String corpoCandidato(String email) {
		return """
				{"nome": "Candidato de teste", "email": "%s", "telefone": "(83) 99999-0000",
				 "dataNascimento": "1990-05-20"}
				""".formatted(email);
	}

}
