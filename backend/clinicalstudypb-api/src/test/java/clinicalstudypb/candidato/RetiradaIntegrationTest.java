package clinicalstudypb.candidato;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3768 (RF16): retirada no banco real, com a migração V13, o cancelamento das visitas agendadas e a vaga
// liberada. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class RetiradaIntegrationTest {

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
	private Usuario conta;
	private Long estudoId;
	private Long previstaId;
	private Long participanteId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Retirada", "coord.ret." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Retirada", "pesq.ret." + sufixo + "@clinical.test",
				null, Perfil.PESQUISADOR, "hash"));
		conta = usuarios.save(new Usuario("Participante Retirada", "part.ret." + sufixo + "@teste.com", null,
				Perfil.PARTICIPANTE, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de retirada", "Objetivo do teste de retirada", pesquisadora,
				LocalDate.now(), null, 2));
		estudoId = estudo.getId();
		jdbc.update("update estudo set estado = 'EXECUCAO' where id = ?", estudoId);
		previstaId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 1, 'Triagem', 0, 30) returning id""", Long.class, estudoId);
		participanteId = jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, data_inclusao, usuario_id)
				values (?, 'Participante Retirada', ?, '1990-05-20', 'INCLUIDO', ?, ?) returning id""", Long.class,
				estudoId, conta.getEmail(), LocalDate.now(), conta.getId());
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from visita where candidato_id in (select id from candidato where estudo_id = ?)", estudoId);
		jdbc.update("delete from candidato where estudo_id = ?", estudoId);
		jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		jdbc.update("delete from usuario where id in (?, ?, ?)", coordenador.getId(), pesquisadora.getId(),
				conta.getId());
	}

	@Test
	void retiraCancelaSoAsAgendadasLiberaAVagaEMantemAConta() throws Exception {
		Long retorno = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 2, 'Retorno', 0, 30) returning id""", Long.class, estudoId);
		Long realizada = inserirVisita(previstaId, "REALIZADA", "now() - interval '1 day'");
		Long agendada = inserirVisita(retorno, "AGENDADA", "now() + interval '1 day'");

		retirar("{\"motivo\": \"Mudou de cidade\"}")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.candidato.status").value("RETIRADO"))
				.andExpect(jsonPath("$.candidato.retirada.registradaPor").value("Coordenador Retirada"))
				.andExpect(jsonPath("$.candidato.retirada.motivo").value("Mudou de cidade"))
				.andExpect(jsonPath("$.visitasCanceladas").value(1))
				.andExpect(jsonPath("$.vagasOcupadas").value(0))
				.andExpect(jsonPath("$.limiteParticipantes").value(2));

		assertThat(statusDaVisita(agendada)).isEqualTo("CANCELADA");
		assertThat(jdbc.queryForObject("select observacao from visita where id = ?", String.class, agendada))
				.isEqualTo("Retirada do participante");
		assertThat(statusDaVisita(realizada)).isEqualTo("REALIZADA");
		assertThat(jdbc.queryForObject("select ativo from usuario where id = ?", Boolean.class, conta.getId())).isTrue();

		// A consulta do candidato (fora da transação da retirada) também traz quem registrou
		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/candidatos/" + participanteId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.retirada.registradaPor").value("Coordenador Retirada"));
		mvc.perform(como(coordenador, get("/estudos/" + estudoId + "/candidatos")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].retirada.motivo").value("Mudou de cidade"));
	}

	@Test
	void segundaRetiradaEMotivoVazioSaoRecusados() throws Exception {
		retirar("{\"motivo\": \"  \"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[0].campo").value("motivo"));
		retirar("{\"motivo\": \"Mudou de cidade\"}").andExpect(status().isOk());
		retirar("{\"motivo\": \"De novo\"}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_JA_RETIRADO"));
	}

	@Test
	void retiradosDoSeedTemDataEMotivoDepoisDaV13() {
		assertThat(jdbc.queryForObject(
				"select count(*) from candidato where status = 'RETIRADO' and retirada_registrada_em is null",
				Integer.class)).isZero();
	}

	// ---- Apoio

	private Long inserirVisita(Long prevista, String status, String dataHora) {
		return jdbc.queryForObject("""
				insert into visita (candidato_id, visita_prevista_id, data_hora, status, agendada_por_id)
				values (?, ?, %s, ?, ?) returning id""".formatted(dataHora), Long.class,
				participanteId, prevista, status, coordenador.getId());
	}

	private String statusDaVisita(Long id) {
		return jdbc.queryForObject("select status from visita where id = ?", String.class, id);
	}

	private ResultActions retirar(String corpo) throws Exception {
		return mvc.perform(como(coordenador, post("/candidatos/" + participanteId + "/retirada"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
