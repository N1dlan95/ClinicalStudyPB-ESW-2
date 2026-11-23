package clinicalstudypb.historico;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.historico.dto.HistoricoResponse;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visita.ResultadoAtividade;
import clinicalstudypb.visita.ResultadoAtividadeRepository;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visita.VisitaRepository;
import clinicalstudypb.visitaprevista.Atividade;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// Task 3765 (T-96, RF15): montagem do histórico do participante
@ExtendWith(MockitoExtension.class)
class HistoricoServiceTest {

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private VisitaRepository visitas;

	@Mock
	private ResultadoAtividadeRepository resultados;

	private HistoricoService servico;
	private Candidato participante;
	private VisitaPrevista triagem;
	private VisitaPrevista retorno;
	private Atividade pressao;
	private Atividade glicemia;
	private Usuario coordenador;

	@BeforeEach
	void configurar() {
		servico = new HistoricoService(candidatos, visitas, resultados);
		Estudo estudo = new Estudo("Estudo de Controle Glicêmico", "Objetivo",
				new Usuario("Ana", "ana@teste.com", null, Perfil.PESQUISADOR, "hash"), LocalDate.of(2026, 11, 1), null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		participante = new Candidato(estudo, "João Silva", "joao@teste.com", null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(participante, "id", 5L);
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.INCLUIDO);
		ReflectionTestUtils.setField(participante, "dataInclusao", LocalDate.of(2026, 11, 2));
		triagem = new VisitaPrevista(estudo, 1, "Triagem", 0, null, null);
		ReflectionTestUtils.setField(triagem, "id", 20L);
		pressao = new Atividade(1, "Aferir pressão arterial");
		glicemia = new Atividade(2, "Coletar glicemia");
		triagem.substituirAtividades(List.of(pressao, glicemia));
		ReflectionTestUtils.setField(pressao, "id", 40L);
		ReflectionTestUtils.setField(glicemia, "id", 41L);
		retorno = new VisitaPrevista(estudo, 2, "Retorno", 30, null, null);
		ReflectionTestUtils.setField(retorno, "id", 21L);
		coordenador = new Usuario("Carlos", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
		ReflectionTestUtils.setField(coordenador, "id", 3L);
	}

	@Test
	void montaAParticipacaoEAsVisitasNaOrdemComOsResultadosDeCadaUma() {
		Visita realizada = visita(70L, triagem, LocalDateTime.of(2026, 11, 2, 9, 0), StatusVisita.REALIZADA, null);
		Visita cancelada = visita(71L, retorno, LocalDateTime.of(2026, 11, 20, 9, 0), StatusVisita.CANCELADA,
				"Participante viajou");
		Visita agendada = visita(72L, retorno, LocalDateTime.of(2026, 12, 2, 9, 0), StatusVisita.AGENDADA, null);
		when(candidatos.buscarParaHistorico(5L)).thenReturn(Optional.of(participante));
		when(visitas.buscarDoHistorico(5L)).thenReturn(List.of(realizada, cancelada, agendada));
		// Vêm fora da ordem do protocolo: o histórico ordena pela ordem da atividade
		when(resultados.findByVisitaParticipanteId(5L)).thenReturn(List.of(
				resultado(realizada, glicemia, "92 mg/dL", "Em jejum"),
				resultado(realizada, pressao, "PA 120x80", null)));

		HistoricoResponse historico = servico.consultar(5L);

		assertThat(historico.participante()).isEqualTo(new HistoricoResponse.Participante(5L, "João Silva",
				"joao@teste.com", StatusCandidato.INCLUIDO, LocalDate.of(2026, 11, 2), null));
		assertThat(historico.estudo()).isEqualTo(new HistoricoResponse.EstudoResumo(1L, "Estudo de Controle Glicêmico"));
		assertThat(historico.visitas()).extracting(HistoricoResponse.VisitaHistorico::id).containsExactly(70L, 71L, 72L);

		HistoricoResponse.VisitaHistorico primeira = historico.visitas().get(0);
		assertThat(primeira.visitaPrevista().nome()).isEqualTo("Triagem");
		assertThat(primeira.status()).isEqualTo(StatusVisita.REALIZADA);
		assertThat(primeira.resultados()).extracting(item -> item.descricao(), item -> item.resultado())
				.containsExactly(tuple("Aferir pressão arterial", "PA 120x80"),
						tuple("Coletar glicemia", "92 mg/dL"));
		assertThat(primeira.resultados().get(1).observacao()).isEqualTo("Em jejum");
		assertThat(primeira.resultados().get(0).registradoPor()).isEqualTo("Carlos");

		assertThat(historico.visitas().get(1).observacao()).isEqualTo("Participante viajou");
		assertThat(historico.visitas().get(1).resultados()).isEmpty();
		assertThat(historico.visitas().get(2).status()).isEqualTo(StatusVisita.AGENDADA);
		assertThat(historico.visitas().get(2).resultados()).isEmpty();
	}

	@Test
	void retiradoTemHistoricoComADataOMotivoEQuemRetirou() {
		participante.retirar("Mudou de cidade", coordenador);
		when(candidatos.buscarParaHistorico(5L)).thenReturn(Optional.of(participante));
		when(visitas.buscarDoHistorico(5L)).thenReturn(List.of());

		HistoricoResponse historico = servico.consultar(5L);

		assertThat(historico.participante().status()).isEqualTo(StatusCandidato.RETIRADO);
		assertThat(historico.participante().retirada().motivo()).isEqualTo("Mudou de cidade");
		assertThat(historico.participante().retirada().registradaPor()).isEqualTo("Carlos");
		assertThat(historico.participante().retirada().registradaEm()).isNotNull();
	}

	// Retiradas do seed, anteriores ao RF16, não têm quem registrou
	@Test
	void retiradaSemResponsavelVemComRegistradaPorNulo() {
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.RETIRADO);
		ReflectionTestUtils.setField(participante, "retiradaRegistradaEm", LocalDateTime.of(2026, 11, 10, 8, 0));
		ReflectionTestUtils.setField(participante, "motivoRetirada", "Desistência");
		when(candidatos.buscarParaHistorico(5L)).thenReturn(Optional.of(participante));
		when(visitas.buscarDoHistorico(5L)).thenReturn(List.of());

		assertThat(servico.consultar(5L).participante().retirada().registradaPor()).isNull();
	}

	@Test
	void semVisitasNaoConsultaOsResultados() {
		when(candidatos.buscarParaHistorico(5L)).thenReturn(Optional.of(participante));
		when(visitas.buscarDoHistorico(5L)).thenReturn(List.of());

		assertThat(servico.consultar(5L).visitas()).isEmpty();
		verify(resultados, never()).findByVisitaParticipanteId(any());
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = { "CADASTRADO", "ELEGIVEL", "INELEGIVEL" })
	void candidatoQueNuncaFoiIncluidoRetornaParticipanteNaoIncluido(StatusCandidato status) {
		ReflectionTestUtils.setField(participante, "status", status);
		when(candidatos.buscarParaHistorico(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.consultar(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class, erro -> {
					assertThat(erro.getCodigo()).isEqualTo("PARTICIPANTE_NAO_INCLUIDO");
					assertThat(erro.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verifyNoInteractions(visitas, resultados);
	}

	@Test
	void candidatoInexistenteRetorna404() {
		when(candidatos.buscarParaHistorico(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.consultar(99L)).isInstanceOf(RecursoNaoEncontradoException.class);
		verifyNoInteractions(visitas, resultados);
	}

	// ---- Apoio

	private Visita visita(Long id, VisitaPrevista prevista, LocalDateTime dataHora, StatusVisita status,
			String observacao) {
		Visita visita = new Visita(participante, prevista, dataHora, "Sala 2", coordenador);
		ReflectionTestUtils.setField(visita, "id", id);
		if (status != StatusVisita.AGENDADA) {
			visita.registrarStatus(status, observacao, coordenador);
		}
		return visita;
	}

	private ResultadoAtividade resultado(Visita visita, Atividade atividade, String valor, String observacao) {
		return new ResultadoAtividade(visita, atividade, valor, observacao, coordenador);
	}

}
