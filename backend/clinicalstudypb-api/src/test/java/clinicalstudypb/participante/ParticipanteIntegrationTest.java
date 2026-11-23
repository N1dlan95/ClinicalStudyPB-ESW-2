package clinicalstudypb.participante;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Tasks 3773 e 3775: app do participante no banco real. Cada participante só vê as próprias
// participações e visitas, sempre pelo usuário do token. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class ParticipanteIntegrationTest {

	private static final LocalDateTime AGORA = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private JdbcTemplate jdbc;

	private Usuario pesquisadora;
	private Usuario coordenador;
	private Usuario ana;
	private Usuario bruno;
	private Usuario semEstudos;
	private Long estudoAtual;
	private Long estudoAntigo;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		pesquisadora = usuario("Pesquisadora App", "pesq.app." + sufixo, Perfil.PESQUISADOR);
		coordenador = usuario("Coordenador App", "coord.app." + sufixo, Perfil.COORDENADOR);
		ana = usuario("Ana Participante", "ana.app." + sufixo, Perfil.PARTICIPANTE);
		bruno = usuario("Bruno Participante", "bruno.app." + sufixo, Perfil.PARTICIPANTE);
		semEstudos = usuario("Sem Estudos", "sem.app." + sufixo, Perfil.PARTICIPANTE);

		estudoAtual = estudo("Estudo de Controle Glicêmico");
		estudoAntigo = estudo("Estudo de Hipertensão");

		// Ana: incluída no estudo atual há 10 dias e retirada do estudo antigo; também é candidata (não incluída)
		// em um terceiro vínculo, que não pode aparecer no app
		Long anaAtual = candidato(estudoAtual, ana, "INCLUIDO", AGORA.toLocalDate().minusDays(10), null);
		candidato(estudoAntigo, ana, "RETIRADO", AGORA.toLocalDate().minusDays(60), AGORA.minusDays(30));
		Long brunoAtual = candidato(estudoAtual, bruno, "INCLUIDO", AGORA.toLocalDate().minusDays(5), null);
		jdbc.update("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, usuario_id)
				values (?, 'Ana Participante', ?, '1990-05-20', 'ELEGIVEL', ?)""",
				estudoAntigo, "ana.elegivel." + sufixo + "@teste.com", ana.getId());

		visita(anaAtual, prevista(estudoAtual, 1, "Visita inicial"), AGORA.minusDays(9), "REALIZADA");
		visita(anaAtual, prevista(estudoAtual, 2, "Retorno de 7 dias"), AGORA.minusDays(2), "AUSENTE");
		visita(anaAtual, prevista(estudoAtual, 3, "Remarcada"), AGORA.plusDays(1), "CANCELADA");
		visita(anaAtual, prevista(estudoAtual, 4, "Retorno de 30 dias"), AGORA.plusDays(20), "AGENDADA");
		visita(anaAtual, prevista(estudoAtual, 5, "Visita final"), AGORA.plusDays(80), "AGENDADA");
		visita(brunoAtual, prevista(estudoAtual, 6, "Visita do Bruno"), AGORA.plusDays(3), "AGENDADA");
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		for (Long estudoId : new Long[] { estudoAtual, estudoAntigo }) {
			jdbc.update("delete from visita where candidato_id in (select id from candidato where estudo_id = ?)", estudoId);
			jdbc.update("delete from candidato where estudo_id = ?", estudoId);
			jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
			jdbc.update("delete from estudo where id = ?", estudoId);
		}
		for (Usuario usuario : new Usuario[] { pesquisadora, coordenador, ana, bruno, semEstudos }) {
			jdbc.update("delete from usuario where id = ?", usuario.getId());
		}
	}

	// ---- RF17: estudos

	@Test
	void listaAsParticipacoesDoTokenDasMaisRecentesParaAsMaisAntigas() throws Exception {
		mvc.perform(como(ana, get("/participantes/me/estudos")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].id").value(estudoAtual))
				.andExpect(jsonPath("$[0].titulo").value("Estudo de Controle Glicêmico"))
				.andExpect(jsonPath("$[0].responsavel").value("Pesquisadora App"))
				.andExpect(jsonPath("$[0].estado").value("EXECUCAO"))
				.andExpect(jsonPath("$[0].participacao").value("INCLUIDO"))
				.andExpect(jsonPath("$[0].dataInclusao").value(AGORA.toLocalDate().minusDays(10).toString()))
				.andExpect(jsonPath("$[0].retiradaEm").isEmpty())
				.andExpect(jsonPath("$[1].id").value(estudoAntigo))
				.andExpect(jsonPath("$[1].participacao").value("RETIRADO"))
				.andExpect(jsonPath("$[1].retiradaEm").isNotEmpty())
				.andExpect(jsonPath("$[1].proximaVisita").isEmpty());
	}

	@Test
	void proximaVisitaEAAgendadaMaisProximaIgnorandoAsCanceladas() throws Exception {
		mvc.perform(como(ana, get("/participantes/me/estudos")))
				.andExpect(jsonPath("$[0].proximaVisita.nome").value("Retorno de 30 dias"))
				.andExpect(jsonPath("$[0].proximaVisita.dataHora").value(AGORA.plusDays(20).toString() + ":00"));
	}

	@Test
	void participanteSemEstudosRecebeListaVazia() throws Exception {
		mvc.perform(como(semEstudos, get("/participantes/me/estudos")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
		mvc.perform(como(semEstudos, get("/participantes/me/visitas")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
	}

	// ---- RF18: visitas

	@Test
	void listaAsVisitasDoTokenPorDataSemAsCanceladas() throws Exception {
		mvc.perform(como(ana, get("/participantes/me/visitas")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(4))
				.andExpect(jsonPath("$[0].nome").value("Visita inicial"))
				.andExpect(jsonPath("$[0].status").value("REALIZADA"))
				.andExpect(jsonPath("$[0].estudoId").value(estudoAtual))
				.andExpect(jsonPath("$[0].estudoTitulo").value("Estudo de Controle Glicêmico"))
				.andExpect(jsonPath("$[0].local").value("Sala 2"))
				.andExpect(jsonPath("$[1].status").value("AUSENTE"))
				.andExpect(jsonPath("$[2].nome").value("Retorno de 30 dias"))
				.andExpect(jsonPath("$[2].status").value("AGENDADA"))
				.andExpect(jsonPath("$[3].nome").value("Visita final"))
				.andExpect(jsonPath("$[?(@.status == 'CANCELADA')]").isEmpty())
				.andExpect(jsonPath("$[0].observacao").doesNotExist());
	}

	// ---- Isolamento entre participantes

	@Test
	void cadaParticipanteSoVeOsProprios() throws Exception {
		mvc.perform(como(bruno, get("/participantes/me/estudos")))
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].proximaVisita.nome").value("Visita do Bruno"));
		mvc.perform(como(bruno, get("/participantes/me/visitas")))
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].nome").value("Visita do Bruno"));
		mvc.perform(como(ana, get("/participantes/me/visitas")))
				.andExpect(jsonPath("$[?(@.nome == 'Visita do Bruno')]").isEmpty());
	}

	// ---- Acesso

	@Test
	void somenteParticipanteAcessaESemTokenRecebe401() throws Exception {
		mvc.perform(como(coordenador, get("/participantes/me/estudos")))
				.andExpect(status().isForbidden());
		mvc.perform(como(pesquisadora, get("/participantes/me/visitas")))
				.andExpect(status().isForbidden());
		mvc.perform(get("/participantes/me/estudos"))
				.andExpect(status().isUnauthorized());
	}

	// ---- Apoio

	private Usuario usuario(String nome, String email, Perfil perfil) {
		return usuarios.save(new Usuario(nome, email + "@clinical.test", null, perfil, "hash"));
	}

	private Long estudo(String titulo) {
		return jdbc.queryForObject("""
				insert into estudo (titulo, objetivo, responsavel_id, data_inicio, limite_participantes, estado)
				values (?, 'Objetivo do teste do app', ?, ?, 10, 'EXECUCAO') returning id""",
				Long.class, titulo, pesquisadora.getId(), LocalDate.now().minusMonths(3));
	}

	private Long candidato(Long estudoId, Usuario conta, String status, LocalDate dataInclusao, LocalDateTime retiradaEm) {
		return jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, usuario_id, data_inclusao,
				                       retirada_registrada_em)
				values (?, ?, ?, '1990-05-20', ?, ?, ?, ?) returning id""",
				Long.class, estudoId, conta.getNome(), conta.getEmail(), status, conta.getId(), dataInclusao,
				retiradaEm == null ? null : Timestamp.valueOf(retiradaEm));
	}

	private Long prevista(Long estudoId, int ordem, String nome) {
		return jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, ?, ?, ?, 2) returning id""", Long.class, estudoId, ordem, nome, ordem * 10);
	}

	private void visita(Long candidatoId, Long previstaId, LocalDateTime dataHora, String status) {
		jdbc.update("""
				insert into visita (candidato_id, visita_prevista_id, data_hora, local, status, observacao, agendada_por_id)
				values (?, ?, ?, 'Sala 2', ?, 'Anotação interna da equipe', ?)""",
				candidatoId, previstaId, Timestamp.valueOf(dataHora), status, coordenador.getId());
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
