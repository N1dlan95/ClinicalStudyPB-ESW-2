package clinicalstudypb.visita;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3763 (RF14): resultados das atividades no banco real, com a migração V12, a substituição (upsert)
// e o bloqueio da edição da visita prevista que já tem resultado. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class ResultadoIntegrationTest {

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
	private Long pressaoId;
	private Long glicemiaId;
	private Long participanteId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Resultados", "coord.r." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Resultados", "pesq.r." + sufixo + "@clinical.test",
				null, Perfil.PESQUISADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo de resultados", "Objetivo do teste de resultados", pesquisadora,
				LocalDate.now(), null, 10));
		estudoId = estudo.getId();
		jdbc.update("update estudo set estado = 'EXECUCAO' where id = ?", estudoId);
		previstaId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 1, 'Triagem', 0, 2) returning id""", Long.class, estudoId);
		pressaoId = jdbc.queryForObject("""
				insert into atividade (visita_prevista_id, ordem, descricao)
				values (?, 1, 'Aferir pressão arterial') returning id""", Long.class, previstaId);
		glicemiaId = jdbc.queryForObject("""
				insert into atividade (visita_prevista_id, ordem, descricao)
				values (?, 2, 'Coletar glicemia') returning id""", Long.class, previstaId);
		participanteId = jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, data_inclusao)
				values (?, 'Participante de teste', ?, '1990-05-20', 'INCLUIDO', ?) returning id""", Long.class,
				estudoId, "participante." + sufixo + "@teste.com", LocalDate.now());
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
		jdbc.update("delete from usuario where id in (?, ?)", coordenador.getId(), pesquisadora.getId());
	}

	@Test
	void registraSubstituiEOPesquisadorConsulta() throws Exception {
		Long visitaId = inserirVisita("REALIZADA");

		registrar(visitaId, "{\"itens\": [{\"atividadeId\": %d, \"resultado\": \"PA 130x90\"}]}".formatted(pressaoId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.itens[0].resultado").value("PA 130x90"))
				.andExpect(jsonPath("$.itens[0].registradoPor").value("Coordenador Resultados"))
				.andExpect(jsonPath("$.itens[1].resultado").isEmpty());
		registrar(visitaId, """
				{"itens": [{"atividadeId": %d, "resultado": "PA 120x80"},
				           {"atividadeId": %d, "resultado": "92 mg/dL", "observacao": "Em jejum"}]}"""
				.formatted(pressaoId, glicemiaId))
				.andExpect(status().isOk());

		mvc.perform(como(pesquisadora, get("/visitas/" + visitaId + "/resultados")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.itens[0].resultado").value("PA 120x80"))
				.andExpect(jsonPath("$.itens[1].resultado").value("92 mg/dL"))
				.andExpect(jsonPath("$.itens[1].observacao").value("Em jejum"));
		assertThat(jdbc.queryForObject("select count(*) from resultado_atividade where visita_id = ?", Integer.class,
				visitaId)).isEqualTo(2);
	}

	@Test
	void visitaAgendadaEAtividadeDeOutraVisitaSaoRecusadas() throws Exception {
		Long agendada = inserirVisita("AGENDADA");
		registrar(agendada, "{\"itens\": [{\"atividadeId\": %d, \"resultado\": \"PA 120x80\"}]}".formatted(pressaoId))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_NAO_REALIZADA"));

		jdbc.update("update visita set status = 'REALIZADA' where id = ?", agendada);
		registrar(agendada, "{\"itens\": [{\"atividadeId\": 999999, \"resultado\": \"PA 120x80\"}]}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ATIVIDADE_FORA_DA_VISITA"));
		assertThat(jdbc.queryForObject("select count(*) from resultado_atividade where visita_id = ?", Integer.class,
				agendada)).isZero();
	}

	@Test
	void visitaPrevistaComResultadoNaoEhEditada() throws Exception {
		Long visitaId = inserirVisita("REALIZADA");
		registrar(visitaId, "{\"itens\": [{\"atividadeId\": %d, \"resultado\": \"PA 120x80\"}]}".formatted(pressaoId))
				.andExpect(status().isOk());

		mvc.perform(como(pesquisadora, put("/estudos/" + estudoId + "/visitas-previstas/" + previstaId))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ordem\": 1, \"nome\": \"Triagem nova\", \"diaPrevisto\": 0, \"atividades\": []}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("VISITA_PREVISTA_COM_RESULTADOS"));
		assertThat(jdbc.queryForObject("select count(*) from atividade where visita_prevista_id = ?", Integer.class,
				previstaId)).isEqualTo(2);
	}

	// ---- Apoio

	private Long inserirVisita(String status) {
		return jdbc.queryForObject("""
				insert into visita (candidato_id, visita_prevista_id, data_hora, status, agendada_por_id)
				values (?, ?, now() - interval '1 hour', ?, ?) returning id""", Long.class,
				participanteId, previstaId, status, coordenador.getId());
	}

	private ResultActions registrar(Long visitaId, String corpo) throws Exception {
		return mvc.perform(como(coordenador, put("/visitas/" + visitaId + "/resultados"))
				.contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
