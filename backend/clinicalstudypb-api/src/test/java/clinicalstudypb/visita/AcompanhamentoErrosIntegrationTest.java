package clinicalstudypb.visita;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Erros dos endpoints de RF12 a RF16 no banco real: 403 por perfil, 401 sem token, 404, 400 de validação e os
// 409 que VisitaIntegrationTest, ResultadoIntegrationTest e RetiradaIntegrationTest ainda não cobrem.
// Os casos de sucesso e o fluxo da conta (inclusão + login) estão nesses testes e no RecrutamentoIntegrationTest.
// O histórico (RF15) e /participantes/me/** (RF17 e RF18) entram aqui quando os endpoints existirem.
// Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class AcompanhamentoErrosIntegrationTest {

	private static final long INEXISTENTE = 999_999_999L;

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
	private Usuario administrador;
	private Usuario participante;
	private Long estudoId;
	private Long previstaId;
	private Long retornoId;
	private Long atividadeId;
	private Long participanteId;
	private Long agendadaId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Acompanhamento", "coord.ac." + sufixo + "@clinical.test",
				null, Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Acompanhamento", "pesq.ac." + sufixo + "@clinical.test",
				null, Perfil.PESQUISADOR, "hash"));
		administrador = usuarios.save(new Usuario("Administrador Acompanhamento", "adm.ac." + sufixo + "@clinical.test",
				null, Perfil.ADMINISTRADOR, "hash"));
		participante = usuarios.save(new Usuario("Participante Acompanhamento", "part.ac." + sufixo + "@teste.com",
				null, Perfil.PARTICIPANTE, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de acompanhamento", "Objetivo do teste de erros", pesquisadora,
				LocalDate.now(), null, 10));
		estudoId = estudo.getId();
		definirEstado("EXECUCAO");
		// Visita prevista no D0 com 30 dias de tolerância: qualquer data de hoje ± 30 dias está na janela
		previstaId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 1, 'Triagem', 0, 30) returning id""", Long.class, estudoId);
		atividadeId = jdbc.queryForObject("""
				insert into atividade (visita_prevista_id, ordem, descricao)
				values (?, 1, 'Aferir pressão arterial') returning id""", Long.class, previstaId);
		// A visita agendada usa outra visita prevista: o índice uk_visita_ativa_por_prevista não deixa a mesma
		// visita prevista ter uma AGENDADA e uma REALIZADA para o mesmo participante
		retornoId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 2, 'Retorno', 0, 30) returning id""", Long.class, estudoId);
		participanteId = inserirCandidato(participante.getEmail(), "INCLUIDO", participante.getId());
		agendadaId = inserirVisita(retornoId, "AGENDADA", "now() + interval '1 day'");
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("""
				delete from resultado_atividade where visita_id in
				(select v.id from visita v join candidato c on c.id = v.candidato_id where c.estudo_id = ?)""", estudoId);
		jdbc.update("delete from visita where candidato_id in (select id from candidato where estudo_id = ?)", estudoId);
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?, ?, ?)", coordenador.getId(), pesquisadora.getId(),
				administrador.getId(), participante.getId());
	}

	// ---- Perfis (403)

	@Test
	void somenteOCoordenadorAgendaRegistraStatusResultadosERetirada() throws Exception {
		for (Usuario usuario : new Usuario[] { pesquisadora, administrador, participante }) {
			semPermissao(usuario, post("/candidatos/" + participanteId + "/visitas"), corpoAgendamento(amanha()));
			semPermissao(usuario, put("/visitas/" + agendadaId), corpoReagendamento(amanha()));
			semPermissao(usuario, patch("/visitas/" + agendadaId + "/status"),
					"{\"status\": \"CANCELADA\", \"observacao\": \"Teste de perfil\"}");
			semPermissao(usuario, put("/visitas/" + agendadaId + "/resultados"), corpoResultado(atividadeId));
			semPermissao(usuario, post("/candidatos/" + participanteId + "/retirada"), "{\"motivo\": \"Teste\"}");
			semPermissao(usuario, get("/candidatos/" + participanteId + "/visitas"), null);
			semPermissao(usuario, get("/visitas/" + agendadaId), null);
			semPermissao(usuario, get("/candidatos/" + participanteId + "/conta"), null);
			semPermissao(usuario, post("/candidatos/" + participanteId + "/conta/senha-provisoria"), null);
		}
		// Nenhuma das tentativas mudou a visita nem o participante
		assertThat(jdbc.queryForObject("select status from visita where id = ?", String.class, agendadaId))
				.isEqualTo("AGENDADA");
		assertThat(jdbc.queryForObject("select status from candidato where id = ?", String.class, participanteId))
				.isEqualTo("INCLUIDO");
	}

	@Test
	void pesquisadorEAdministradorConsultamAAgendaEOsResultados() throws Exception {
		Long realizada = inserirVisita(previstaId, "REALIZADA", "now() - interval '1 hour'");
		for (Usuario usuario : new Usuario[] { pesquisadora, administrador }) {
			mvc.perform(como(usuario, get("/estudos/" + estudoId + "/visitas")))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.length()").value(2));
			mvc.perform(como(usuario, get("/visitas/" + realizada + "/resultados")))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.itens[0].atividadeId").value(atividadeId));
		}
	}

	@Test
	void participanteNaoAcessaAAgendaNemOsResultadosPelaApiDaEquipe() throws Exception {
		semPermissao(participante, get("/estudos/" + estudoId + "/visitas"), null);
		semPermissao(participante, get("/visitas/" + agendadaId + "/resultados"), null);
	}

	@Test
	void semTokenRecebe401() throws Exception {
		mvc.perform(get("/estudos/" + estudoId + "/visitas")).andExpect(status().isUnauthorized());
		mvc.perform(get("/visitas/" + agendadaId)).andExpect(status().isUnauthorized());
		mvc.perform(post("/candidatos/" + participanteId + "/retirada")
				.contentType(MediaType.APPLICATION_JSON).content("{\"motivo\": \"Teste\"}"))
				.andExpect(status().isUnauthorized());
	}

	// ---- Consulta de uma visita (GET /visitas/{id})

	@Test
	void consultaUmaVisitaComAVisitaPrevistaEAJanela() throws Exception {
		mvc.perform(como(coordenador, get("/visitas/" + agendadaId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(agendadaId))
				.andExpect(jsonPath("$.status").value("AGENDADA"))
				.andExpect(jsonPath("$.visitaPrevista.nome").value("Retorno"))
				.andExpect(jsonPath("$.janela.fim").value(LocalDate.now().plusDays(30).toString()));
	}

	// ---- Inexistentes (404)

	@Test
	void recursosInexistentesRetornam404() throws Exception {
		naoEncontrado(post("/candidatos/" + INEXISTENTE + "/visitas"), corpoAgendamento(amanha()));
		naoEncontrado(post("/candidatos/" + participanteId + "/visitas"),
				"{\"visitaPrevistaId\": %d, \"dataHora\": \"%s\"}".formatted(INEXISTENTE, amanha()));
		naoEncontrado(get("/candidatos/" + INEXISTENTE + "/visitas"), null);
		naoEncontrado(get("/estudos/" + INEXISTENTE + "/visitas"), null);
		naoEncontrado(get("/visitas/" + INEXISTENTE), null);
		naoEncontrado(put("/visitas/" + INEXISTENTE), corpoReagendamento(amanha()));
		naoEncontrado(patch("/visitas/" + INEXISTENTE + "/status"), "{\"status\": \"REALIZADA\"}");
		naoEncontrado(get("/visitas/" + INEXISTENTE + "/resultados"), null);
		naoEncontrado(put("/visitas/" + INEXISTENTE + "/resultados"), corpoResultado(atividadeId));
		naoEncontrado(post("/candidatos/" + INEXISTENTE + "/retirada"), "{\"motivo\": \"Teste\"}");
		naoEncontrado(get("/candidatos/" + INEXISTENTE + "/conta"), null);
		naoEncontrado(post("/candidatos/" + INEXISTENTE + "/conta/senha-provisoria"), null);
	}

	@Test
	void participanteSemContaNaoRecebeSenhaProvisoria() throws Exception {
		Long semConta = inserirCandidato("sem.conta." + UUID.randomUUID() + "@teste.com", "INCLUIDO", null);

		naoEncontrado(post("/candidatos/" + semConta + "/conta/senha-provisoria"), null);
	}

	// ---- Validação (400)

	@Test
	void corposInvalidosRetornam400ApontandoOCampo() throws Exception {
		invalido(post("/candidatos/" + participanteId + "/visitas"), "{\"dataHora\": \"%s\"}".formatted(amanha()),
				"visitaPrevistaId");
		invalido(put("/visitas/" + agendadaId), "{\"local\": \"Sala 2\"}", "dataHora");
		invalido(put("/visitas/" + agendadaId), corpoReagendamento(LocalDate.now().plusDays(31).atTime(9, 0)),
				"dataHora");
		invalido(patch("/visitas/" + agendadaId + "/status"), "{}", "status");
		invalido(patch("/visitas/" + agendadaId + "/status"), "{\"status\": \"AGENDADA\"}", "status");
		invalido(put("/visitas/" + agendadaId + "/resultados"), "{\"itens\": []}", "itens");
		invalido(post("/candidatos/" + participanteId + "/retirada"), "{}", "motivo");

		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/visitas")
				.param("de", amanha().toString()).param("ate", LocalDateTime.now().toString())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("ate"));
	}

	@Test
	void resultadoEmBrancoOuAtividadeRepetidaRetornam400() throws Exception {
		Long realizada = inserirVisita(previstaId, "REALIZADA", "now() - interval '1 hour'");

		mvc.perform(como(coordenador, put("/visitas/" + realizada + "/resultados"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"itens\": [{\"atividadeId\": %d, \"resultado\": \" \"}]}".formatted(atividadeId)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
		mvc.perform(como(coordenador, put("/visitas/" + realizada + "/resultados"))
				.contentType(MediaType.APPLICATION_JSON).content("""
						{"itens": [{"atividadeId": %d, "resultado": "PA 120x80"},
						           {"atividadeId": %d, "resultado": "PA 130x90"}]}""".formatted(atividadeId, atividadeId)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("itens"));
		assertThat(jdbc.queryForObject("select count(*) from resultado_atividade where visita_id = ?", Integer.class,
				realizada)).isZero();
	}

	// ---- Regras de negócio (409)

	@Test
	void visitaFinalizadaNaoEhReagendada() throws Exception {
		Long realizada = inserirVisita(previstaId, "REALIZADA", "now() - interval '1 hour'");

		conflito(put("/visitas/" + realizada), corpoReagendamento(amanha()), "VISITA_JA_FINALIZADA");
	}

	@Test
	void estudoEncerradoBloqueiaAgendamentoReagendamentoStatusERetirada() throws Exception {
		definirEstado("ENCERRADO");

		conflito(post("/candidatos/" + participanteId + "/visitas"), corpoAgendamento(amanha()), "ESTUDO_ENCERRADO");
		conflito(put("/visitas/" + agendadaId), corpoReagendamento(amanha()), "ESTUDO_ENCERRADO");
		conflito(patch("/visitas/" + agendadaId + "/status"),
				"{\"status\": \"CANCELADA\", \"observacao\": \"Estudo encerrado\"}", "ESTUDO_ENCERRADO");
		conflito(post("/candidatos/" + participanteId + "/retirada"), "{\"motivo\": \"Teste\"}", "ESTUDO_ENCERRADO");

		assertThat(jdbc.queryForObject("select status from visita where id = ?", String.class, agendadaId))
				.isEqualTo("AGENDADA");
		assertThat(jdbc.queryForObject("select status from candidato where id = ?", String.class, participanteId))
				.isEqualTo("INCLUIDO");
	}

	@Test
	void candidatoQueNaoFoiIncluidoNaoEhRetirado() throws Exception {
		Long elegivel = inserirCandidato("elegivel." + UUID.randomUUID() + "@teste.com", "ELEGIVEL", null);

		conflito(post("/candidatos/" + elegivel + "/retirada"), "{\"motivo\": \"Teste\"}", "PARTICIPANTE_NAO_INCLUIDO");
	}

	// ---- Apoio

	private void semPermissao(Usuario usuario, MockHttpServletRequestBuilder requisicao, String corpo)
			throws Exception {
		executar(usuario, requisicao, corpo)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
	}

	private void naoEncontrado(MockHttpServletRequestBuilder requisicao, String corpo) throws Exception {
		executar(coordenador, requisicao, corpo)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	private void invalido(MockHttpServletRequestBuilder requisicao, String corpo, String campo) throws Exception {
		executar(coordenador, requisicao, corpo)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes[0].campo").value(campo));
	}

	private void conflito(MockHttpServletRequestBuilder requisicao, String corpo, String codigo) throws Exception {
		executar(coordenador, requisicao, corpo)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value(codigo));
	}

	private ResultActions executar(Usuario usuario, MockHttpServletRequestBuilder requisicao, String corpo)
			throws Exception {
		if (corpo != null) {
			requisicao.contentType(MediaType.APPLICATION_JSON).content(corpo);
		}
		return mvc.perform(como(usuario, requisicao));
	}

	private LocalDateTime amanha() {
		return LocalDate.now().plusDays(1).atTime(9, 0);
	}

	private String corpoAgendamento(LocalDateTime dataHora) {
		return "{\"visitaPrevistaId\": %d, \"dataHora\": \"%s\", \"local\": \"Sala 3\"}".formatted(previstaId, dataHora);
	}

	private String corpoReagendamento(LocalDateTime dataHora) {
		return "{\"dataHora\": \"%s\", \"local\": \"Sala 2\"}".formatted(dataHora);
	}

	private String corpoResultado(Long atividade) {
		return "{\"itens\": [{\"atividadeId\": %d, \"resultado\": \"PA 120x80\"}]}".formatted(atividade);
	}

	private void definirEstado(String estado) {
		jdbc.update("update estudo set estado = ? where id = ?", estado, estudoId);
	}

	private Long inserirCandidato(String email, String status, Long usuarioId) {
		return jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, data_inclusao, usuario_id)
				values (?, 'Participante de teste', ?, '1990-05-20', ?, ?, ?) returning id""", Long.class,
				estudoId, email, status, "INCLUIDO".equals(status) ? LocalDate.now() : null, usuarioId);
	}

	private Long inserirVisita(Long prevista, String status, String dataHora) {
		return jdbc.queryForObject("""
				insert into visita (candidato_id, visita_prevista_id, data_hora, status, agendada_por_id)
				values (?, ?, %s, ?, ?) returning id""".formatted(dataHora), Long.class,
				participanteId, prevista, status, coordenador.getId());
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
