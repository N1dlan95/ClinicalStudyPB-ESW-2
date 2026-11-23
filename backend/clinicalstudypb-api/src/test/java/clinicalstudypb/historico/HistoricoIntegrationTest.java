package clinicalstudypb.historico;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3765 (T-96, RF15): histórico no banco real, com as consultas do repositório (visitas com a visita prevista
// e resultados de todas as visitas de uma vez) e a autorização pelo token. Precisa do PostgreSQL rodando, como no CI.
@SpringBootTest
@AutoConfigureMockMvc
class HistoricoIntegrationTest {

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
	private Usuario conta;
	private Long estudoId;
	private Long triagemId;
	private Long retornoId;
	private Long pressaoId;
	private Long glicemiaId;
	private Long participanteId;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		coordenador = usuarios.save(new Usuario("Coordenador Histórico", "coord.h." + sufixo + "@clinical.test", null,
				Perfil.COORDENADOR, "hash"));
		pesquisadora = usuarios.save(new Usuario("Pesquisadora Histórico", "pesq.h." + sufixo + "@clinical.test", null,
				Perfil.PESQUISADOR, "hash"));
		administrador = usuarios.save(new Usuario("Administrador Histórico", "adm.h." + sufixo + "@clinical.test", null,
				Perfil.ADMINISTRADOR, "hash"));
		conta = usuarios.save(new Usuario("Participante Histórico", "part.h." + sufixo + "@teste.com", null,
				Perfil.PARTICIPANTE, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo do histórico", "Objetivo do teste do histórico", pesquisadora,
				LocalDate.now(), null, 10));
		estudoId = estudo.getId();
		jdbc.update("update estudo set estado = 'EXECUCAO' where id = ?", estudoId);
		triagemId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 1, 'Triagem', 0, 30) returning id""", Long.class, estudoId);
		pressaoId = jdbc.queryForObject("""
				insert into atividade (visita_prevista_id, ordem, descricao)
				values (?, 1, 'Aferir pressão arterial') returning id""", Long.class, triagemId);
		glicemiaId = jdbc.queryForObject("""
				insert into atividade (visita_prevista_id, ordem, descricao)
				values (?, 2, 'Coletar glicemia') returning id""", Long.class, triagemId);
		retornoId = jdbc.queryForObject("""
				insert into visita_prevista (estudo_id, ordem, nome, dia_previsto, janela_dias)
				values (?, 2, 'Retorno', 0, 30) returning id""", Long.class, estudoId);
		participanteId = jdbc.queryForObject("""
				insert into candidato (estudo_id, nome, email, data_nascimento, status, data_inclusao, usuario_id)
				values (?, 'Participante Histórico', ?, '1990-05-20', 'INCLUIDO', ?, ?) returning id""", Long.class,
				estudoId, conta.getEmail(), LocalDate.now().minusDays(5), conta.getId());
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
				administrador.getId(), conta.getId());
	}

	@Test
	void pesquisadorConsultaAsVisitasEmOrdemComOsResultados() throws Exception {
		// Inseridas fora da ordem: a resposta vem da mais antiga para a mais recente
		Long agendada = inserirVisita(retornoId, "AGENDADA", "now() + interval '2 days'", null);
		Long cancelada = inserirVisita(retornoId, "CANCELADA", "now() - interval '1 day'", "Participante viajou");
		Long realizada = inserirVisita(triagemId, "REALIZADA", "now() - interval '3 days'", null);
		inserirResultado(realizada, glicemiaId, "92 mg/dL");
		inserirResultado(realizada, pressaoId, "PA 120x80");

		mvc.perform(como(pesquisadora, get("/candidatos/" + participanteId + "/historico")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.participante.nome").value("Participante Histórico"))
				.andExpect(jsonPath("$.participante.email").value(conta.getEmail()))
				.andExpect(jsonPath("$.participante.status").value("INCLUIDO"))
				.andExpect(jsonPath("$.participante.retirada").isEmpty())
				.andExpect(jsonPath("$.estudo.id").value(estudoId))
				.andExpect(jsonPath("$.estudo.titulo").value("Estudo do histórico"))
				.andExpect(jsonPath("$.visitas.length()").value(3))
				.andExpect(jsonPath("$.visitas[0].id").value(realizada))
				.andExpect(jsonPath("$.visitas[0].visitaPrevista.nome").value("Triagem"))
				.andExpect(jsonPath("$.visitas[0].resultados[0].descricao").value("Aferir pressão arterial"))
				.andExpect(jsonPath("$.visitas[0].resultados[0].resultado").value("PA 120x80"))
				.andExpect(jsonPath("$.visitas[0].resultados[0].registradoPor").value("Coordenador Histórico"))
				.andExpect(jsonPath("$.visitas[0].resultados[1].resultado").value("92 mg/dL"))
				.andExpect(jsonPath("$.visitas[1].id").value(cancelada))
				.andExpect(jsonPath("$.visitas[1].status").value("CANCELADA"))
				.andExpect(jsonPath("$.visitas[1].observacao").value("Participante viajou"))
				.andExpect(jsonPath("$.visitas[1].resultados").isEmpty())
				.andExpect(jsonPath("$.visitas[2].id").value(agendada))
				.andExpect(jsonPath("$.visitas[2].visitaPrevista.nome").value("Retorno"))
				.andExpect(jsonPath("$.visitas[2].resultados").isEmpty());
	}

	@Test
	void retiradoMostraARetiradaComQuemRegistrou() throws Exception {
		jdbc.update("""
				update candidato set status = 'RETIRADO', motivo_retirada = 'Mudou de cidade',
				retirada_registrada_em = now(), retirada_registrada_por_id = ? where id = ?""",
				coordenador.getId(), participanteId);

		for (Usuario usuario : new Usuario[] { coordenador, administrador }) {
			mvc.perform(como(usuario, get("/candidatos/" + participanteId + "/historico")))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.participante.status").value("RETIRADO"))
					.andExpect(jsonPath("$.participante.retirada.motivo").value("Mudou de cidade"))
					.andExpect(jsonPath("$.participante.retirada.registradaPor").value("Coordenador Histórico"))
					.andExpect(jsonPath("$.visitas").isEmpty());
		}
	}

	@Test
	void candidatoNuncaIncluidoRetorna409() throws Exception {
		jdbc.update("update candidato set status = 'ELEGIVEL', data_inclusao = null where id = ?", participanteId);

		mvc.perform(como(pesquisadora, get("/candidatos/" + participanteId + "/historico")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("PARTICIPANTE_NAO_INCLUIDO"));
		mvc.perform(como(pesquisadora, get("/candidatos/999999999/historico")))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void participanteNaoConsultaNemOProprioHistorico() throws Exception {
		mvc.perform(como(conta, get("/candidatos/" + participanteId + "/historico")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.codigo").value("SEM_PERMISSAO"));
	}

	// ---- Apoio

	private Long inserirVisita(Long prevista, String status, String dataHora, String observacao) {
		return jdbc.queryForObject("""
				insert into visita (candidato_id, visita_prevista_id, data_hora, status, observacao, agendada_por_id)
				values (?, ?, %s, ?, ?, ?) returning id""".formatted(dataHora), Long.class,
				participanteId, prevista, status, observacao, coordenador.getId());
	}

	private void inserirResultado(Long visitaId, Long atividadeId, String resultado) {
		jdbc.update("""
				insert into resultado_atividade (visita_id, atividade_id, resultado, registrado_por_id, registrado_em,
				criado_em, atualizado_em) values (?, ?, ?, ?, now(), now(), now())""",
				visitaId, atividadeId, resultado, coordenador.getId());
	}

	private MockHttpServletRequestBuilder como(Usuario usuario, MockHttpServletRequestBuilder requisicao) {
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}

}
