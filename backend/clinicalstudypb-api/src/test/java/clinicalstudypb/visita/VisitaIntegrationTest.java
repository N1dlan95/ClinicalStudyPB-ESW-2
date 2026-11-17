package clinicalstudypb.visita;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Tasks 3755/3758 (testes da 3778): agendamento e status das visitas no banco real, com a migração V11,
// o índice que impede dois agendamentos ativos e os filtros da agenda. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class VisitaIntegrationTest {

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

	private Usuario coordenador;
	private Usuario pesquisadora;
	private Long estudoId;
	private Long previstaId;
	private Long participanteId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Visitas", "coord.v." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Visitas", "pesq.v." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de visitas", "Objetivo do teste de visitas", pesquisadora,
				LocalDate.now(), null, 10));
		estudoId = estudo.getId();
		jdbc.update("update estudo set estado = 'EXECUCAO' where id = ?", estudoId);
		// Visita prevista no D0 com 2 dias de tolerância: a janela do participante incluído hoje é hoje ± 2 dias
		previstaId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 1, 'Triagem', 0, 2) returning id""", Long.class, estudoId);
		participanteId = inserirCandidato("participante." + sufixo + "@teste.com", "INCLUIDO");
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from visita where candidato_id in (select id from candidato where estudo_id = ?)", estudoId);
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?)", coordenador.getId(), pesquisadora.getId());
	}

	// ---- RF12: agendamento

	@Test
	void agendaEApareceNaAgendaDoEstudoENaListaDoParticipante() throws Exception {
		LocalDateTime dataHora = LocalDate.now().plusDays(1).atTime(9, 30);

		Long visitaId = agendar(dataHora)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("AGENDADA"))
				.andExpect(jsonPath("$.agendadaPor").value("Coordenador Visitas"))
				.andExpect(jsonPath("$.janela.inicio").value(LocalDate.now().minusDays(2).toString()))
				.andExpect(jsonPath("$.janela.fim").value(LocalDate.now().plusDays(2).toString()))
				.andReturn().getResponse().getContentAsString().transform(this::id);

		mvc.perform(como(pesquisadora, get("/estudos/" + estudoId + "/visitas")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(visitaId));
		mvc.perform(como(coordenador, get("/candidatos/" + participanteId + "/visitas")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].visitaPrevista.nome").value("Triagem"));
	}

	@Test
	void filtrosDaAgendaPorStatusEPeriodo() throws Exception {
		agendar(LocalDate.now().plusDays(1).atTime(9, 0)).andExpect(status().isCreated());
		String amanha = LocalDate.now().plusDays(1).atStartOfDay().toString();
		String depois = LocalDate.now().plusDays(2).atStartOfDay().toString();

		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/visitas").param("de", amanha).param("ate", depois)))
				.andExpect(jsonPath("$.length()").value(1));
		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/visitas").param("de", depois)))
				.andExpect(jsonPath("$.length()").value(0));
		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/visitas").param("status", "REALIZADA")))
				.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void foraDaJanelaEParticipanteNaoIncluidoSaoRecusados() throws Exception {
		agendar(LocalDate.now().plusDays(3).atTime(9, 0))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("dataHora"));

		Long elegivel = inserirCandidato("elegivel." + UUID.randomUUID() + "@teste.com", "ELEGIVEL");
		mvc.perform(como(coordenador, post("/candidatos/" + elegivel + "/visitas"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo(LocalDateTime.now())))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_NAO_INCLUIDO"));
	}

	@Test
	void segundoAgendamentoAtivoEhRecusadoECanceladoLiberaOutro() throws Exception {
		Long primeira = agendar(LocalDate.now().plusDays(1).atTime(9, 0)).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString().transform(this::id);
		agendar(LocalDate.now().plusDays(2).atTime(9, 0))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_JA_AGENDADA"));

		registrar(primeira, "{\"status\": \"CANCELADA\", \"observacao\": \"Participante pediu outra data\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELADA"));
		agendar(LocalDate.now().plusDays(2).atTime(9, 0)).andExpect(status().isCreated());
	}

	@Test
	void oBancoTambemImpedeDoisAgendamentosAtivos() {
		String inserir = """
				insert into visita (candidato_id, visita_prevista_id, data_hora, agendada_por_id)
				values (?, ?, now(), ?)""";
		jdbc.update(inserir, participanteId, previstaId, coordenador.getId());

		org.assertj.core.api.Assertions.assertThatThrownBy(
				() -> jdbc.update(inserir, participanteId, previstaId, coordenador.getId()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void reagendaDentroDaJanela() throws Exception {
		Long visitaId = agendar(LocalDate.now().plusDays(1).atTime(9, 0)).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString().transform(this::id);
		LocalDateTime nova = LocalDate.now().plusDays(2).atTime(15, 0);

		mvc.perform(como(coordenador, put("/visitas/" + visitaId)).contentType(MediaType.APPLICATION_JSON)
				.content("{\"dataHora\": \"%s\", \"local\": \"Sala 2\"}".formatted(nova)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.local").value("Sala 2"));
		assertThat(jdbc.queryForObject("select data_hora from visita where id = ?", LocalDateTime.class, visitaId))
				.isEqualTo(nova);
	}

	// ---- RF13: status

	@Test
	void registraRealizadaUmaVezSo() throws Exception {
		Long visitaId = agendar(LocalDateTime.now().minusMinutes(30).truncatedTo(ChronoUnit.MINUTES))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString().transform(this::id);

		registrar(visitaId, "{\"status\": \"REALIZADA\", \"observacao\": \"Coleta feita\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("REALIZADA"))
				.andExpect(jsonPath("$.statusRegistradoPor").value("Coordenador Visitas"));
		registrar(visitaId, "{\"status\": \"AUSENTE\"}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_JA_FINALIZADA"));

		assertThat(jdbc.queryForObject("select status from visita where id = ?", String.class, visitaId))
				.isEqualTo("REALIZADA");
	}

	@Test
	void ausenciaAntesDoHorarioECancelamentoSemMotivoSaoRecusados() throws Exception {
		Long visitaId = agendar(LocalDate.now().plusDays(1).atTime(9, 0)).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString().transform(this::id);

		registrar(visitaId, "{\"status\": \"AUSENTE\"}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_AINDA_NAO_OCORREU"));
		registrar(visitaId, "{\"status\": \"CANCELADA\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("observacao"));
	}

	@Test
	void visitaPrevistaComAgendamentoNaoEhExcluida() throws Exception {
		agendar(LocalDate.now().plusDays(1).atTime(9, 0)).andExpect(status().isCreated());

		mvc.perform(como(pesquisadora, delete("/estudos/" + estudoId + "/visitas-previstas/" + previstaId)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_PREVISTA_COM_AGENDAMENTOS"));
	}

	// ---- Apoio

	private ResultActions agendar(LocalDateTime dataHora) throws Exception {
		return mvc.perform(como(coordenador, post("/candidatos/" + participanteId + "/visitas"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo(dataHora)));
	}

	private ResultActions registrar(Long visitaId, String corpo) throws Exception {
		return mvc.perform(como(coordenador, patch("/visitas/" + visitaId + "/status"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private String corpo(LocalDateTime dataHora) {
		return "{\"visitaPrevistaId\": %d, \"dataHora\": \"%s\", \"local\": \"Sala 3\"}".formatted(previstaId, dataHora);
	}

	private Long id(String json) {
		return ((Number) JsonPath.read(json, "$.id")).longValue();
	}

	private Long inserirCandidato(String email, String status) {
		return jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, data_inclusao)
				values (?, 'Participante de teste', ?, '1990-05-20', ?, ?) returning id""", Long.class,
				estudoId, email, status, "INCLUIDO".equals(status) ? LocalDate.now() : null);
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
