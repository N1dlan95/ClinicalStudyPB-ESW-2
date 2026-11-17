package clinicalstudypb.visita;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.dto.VisitaReagendamentoRequest;
import clinicalstudypb.visita.dto.VisitaRequest;
import clinicalstudypb.visita.dto.VisitaResponse;
import clinicalstudypb.visita.dto.VisitaStatusRequest;
import clinicalstudypb.visitaprevista.VisitaPrevista;
import clinicalstudypb.visitaprevista.VisitaPrevistaRepository;

// Task 3778 (T-106): regras de agendamento (3755, RF12) e de status da visita (3758, RF13)
@ExtendWith(MockitoExtension.class)
class VisitaServiceTest {

	// Inclusão em 01/11/2026; visita prevista no dia 30 com janela de 3 dias: de 28/11 a 04/12
	private static final LocalDate INCLUSAO = LocalDate.of(2026, 11, 1);
	private static final LocalDateTime NO_DIA = LocalDateTime.of(2026, 12, 1, 9, 0);

	@Mock
	private VisitaRepository visitas;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private VisitaPrevistaRepository visitasPrevistas;

	@Mock
	private EstudoRepository estudos;

	@Mock
	private UsuarioRepository usuarios;

	private VisitaService servico;
	private Estudo estudo;
	private Candidato participante;
	private VisitaPrevista prevista;
	private Usuario coordenador;

	@BeforeEach
	void configurar() {
		servico = new VisitaService(visitas, candidatos, visitasPrevistas, estudos, usuarios);
		estudo = new Estudo("Estudo", "Objetivo",
				new Usuario("Ana", "ana@teste.com", null, Perfil.PESQUISADOR, "hash"), INCLUSAO, null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.EXECUCAO);
		participante = new Candidato(estudo, "João Silva", "joao@teste.com", null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(participante, "id", 5L);
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.INCLUIDO);
		ReflectionTestUtils.setField(participante, "dataInclusao", INCLUSAO);
		prevista = new VisitaPrevista(estudo, 2, "Visita de seguimento", 30, 3, null);
		ReflectionTestUtils.setField(prevista, "id", 20L);
		coordenador = new Usuario("Carlos", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
		ReflectionTestUtils.setField(coordenador, "id", 3L);
	}

	// ---- Agendamento (3755)

	@Test
	void agendaVisitaDentroDaJanela() {
		prepararAgendamento();
		when(visitas.save(any(Visita.class))).thenAnswer(chamada -> comId(chamada.getArgument(0), 70L));

		VisitaResponse resposta = servico.agendar(5L, new VisitaRequest(20L, NO_DIA, "  Sala 3 "), 3L);

		assertThat(resposta.id()).isEqualTo(70L);
		assertThat(resposta.status()).isEqualTo(StatusVisita.AGENDADA);
		assertThat(resposta.local()).isEqualTo("Sala 3");
		assertThat(resposta.dataHora()).isEqualTo(NO_DIA);
		assertThat(resposta.agendadaPor()).isEqualTo("Carlos");
		assertThat(resposta.participante().candidatoId()).isEqualTo(5L);
		assertThat(resposta.visitaPrevista().nome()).isEqualTo("Visita de seguimento");
		assertThat(resposta.janela().inicio()).isEqualTo(LocalDate.of(2026, 11, 28));
		assertThat(resposta.janela().fim()).isEqualTo(LocalDate.of(2026, 12, 4));
	}

	@Test
	void osDoisExtremosDaJanelaSaoAceitos() {
		prepararAgendamento();
		when(visitas.save(any(Visita.class))).thenAnswer(chamada -> chamada.getArgument(0));

		servico.agendar(5L, new VisitaRequest(20L, LocalDateTime.of(2026, 11, 28, 0, 0), null), 3L);
		servico.agendar(5L, new VisitaRequest(20L, LocalDateTime.of(2026, 12, 4, 23, 59), null), 3L);
	}

	@Test
	void dataForaDaJanelaEhRecusada() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(visitasPrevistas.findByIdAndEstudoId(20L, 1L)).thenReturn(Optional.of(prevista));

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(20L, LocalDateTime.of(2026, 12, 5, 8, 0), null), 3L))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> {
					assertThat(ex.getCampo()).isEqualTo("dataHora");
					assertThat(ex.getMessage()).isEqualTo(
							"A visita \"Visita de seguimento\" deve ser entre 28/11/2026 e 04/12/2026");
				});
		verify(visitas, never()).save(any());
	}

	@Test
	void semJanelaSoOProprioDiaEhAceito() {
		VisitaPrevista semJanela = new VisitaPrevista(estudo, 1, "Triagem", 0, null, null);
		ReflectionTestUtils.setField(semJanela, "id", 21L);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(visitasPrevistas.findByIdAndEstudoId(21L, 1L)).thenReturn(Optional.of(semJanela));

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(21L, INCLUSAO.plusDays(1).atTime(9, 0), null), 3L))
				.isInstanceOf(ValidacaoException.class);
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = "INCLUIDO", mode = EnumSource.Mode.EXCLUDE)
	void soParticipanteIncluidoPodeTerVisita(StatusCandidato status) {
		ReflectionTestUtils.setField(participante, "status", status);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(20L, NO_DIA, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("PARTICIPANTE_NAO_INCLUIDO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
	}

	@Test
	void estudoEncerradoNaoAgenda() {
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(20L, NO_DIA, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO"));
	}

	@Test
	void visitaPrevistaDeOutroEstudoNaoEncontrada() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(visitasPrevistas.findByIdAndEstudoId(99L, 1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(99L, NO_DIA, null), 3L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Visita prevista não encontrada neste estudo");
	}

	@Test
	void participanteInexistenteNaoEncontrado() {
		when(candidatos.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.agendar(99L, new VisitaRequest(20L, NO_DIA, null), 3L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Participante não encontrado");
	}

	@Test
	void mesmaVisitaPrevistaNaoEhAgendadaDuasVezes() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(visitasPrevistas.findByIdAndEstudoId(20L, 1L)).thenReturn(Optional.of(prevista));
		when(visitas.existsByParticipanteIdAndVisitaPrevistaIdAndStatusNot(5L, 20L, StatusVisita.CANCELADA))
				.thenReturn(true);

		assertThatThrownBy(() -> servico.agendar(5L, new VisitaRequest(20L, NO_DIA, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("VISITA_JA_AGENDADA"));
		verify(visitas, never()).save(any());
	}

	// ---- Reagendamento

	@Test
	void reagendaVisitaAgendadaDentroDaJanela() {
		Visita visita = visita(StatusVisita.AGENDADA, NO_DIA);
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		VisitaResponse resposta = servico.reagendar(70L,
				new VisitaReagendamentoRequest(LocalDateTime.of(2026, 12, 3, 14, 30), "Sala 1"));

		assertThat(resposta.dataHora()).isEqualTo(LocalDateTime.of(2026, 12, 3, 14, 30));
		assertThat(resposta.local()).isEqualTo("Sala 1");
		assertThat(visita.getStatus()).isEqualTo(StatusVisita.AGENDADA);
	}

	@ParameterizedTest
	@EnumSource(value = StatusVisita.class, names = "AGENDADA", mode = EnumSource.Mode.EXCLUDE)
	void visitaFinalizadaNaoEhReagendada(StatusVisita status) {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita(status, NO_DIA)));

		assertThatThrownBy(() -> servico.reagendar(70L, new VisitaReagendamentoRequest(NO_DIA, null)))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("VISITA_JA_FINALIZADA"));
	}

	@Test
	void reagendamentoForaDaJanelaEhRecusado() {
		Visita visita = visita(StatusVisita.AGENDADA, NO_DIA);
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.reagendar(70L,
				new VisitaReagendamentoRequest(LocalDateTime.of(2026, 11, 27, 9, 0), null)))
				.isInstanceOf(ValidacaoException.class);
		assertThat(visita.getDataHora()).isEqualTo(NO_DIA);
	}

	// ---- Status (3758)

	@ParameterizedTest
	@EnumSource(value = StatusVisita.class, names = { "REALIZADA", "AUSENTE" })
	void registraRealizadaOuAusenteDepoisDoHorario(StatusVisita status) {
		Visita visita = visita(StatusVisita.AGENDADA, LocalDateTime.now().minusHours(1));
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));

		VisitaResponse resposta = servico.registrarStatus(70L, new VisitaStatusRequest(status, " Sem intercorrências "), 3L);

		assertThat(resposta.status()).isEqualTo(status);
		assertThat(resposta.observacao()).isEqualTo("Sem intercorrências");
		assertThat(resposta.statusRegistradoPor()).isEqualTo("Carlos");
		assertThat(resposta.statusRegistradoEm()).isNotNull();
	}

	@ParameterizedTest
	@EnumSource(value = StatusVisita.class, names = { "REALIZADA", "AUSENTE" })
	void realizadaOuAusenteAntesDoHorarioEhRecusada(StatusVisita status) {
		Visita visita = visita(StatusVisita.AGENDADA, LocalDateTime.now().plusDays(1));
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.registrarStatus(70L, new VisitaStatusRequest(status, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("VISITA_AINDA_NAO_OCORREU"));
		assertThat(visita.getStatus()).isEqualTo(StatusVisita.AGENDADA);
	}

	@Test
	void cancelamentoPodeSerAntesDoHorarioComMotivo() {
		Visita visita = visita(StatusVisita.AGENDADA, LocalDateTime.now().plusDays(1));
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));

		servico.registrarStatus(70L, new VisitaStatusRequest(StatusVisita.CANCELADA, "Participante viajou"), 3L);

		assertThat(visita.getStatus()).isEqualTo(StatusVisita.CANCELADA);
		assertThat(visita.getObservacao()).isEqualTo("Participante viajou");
	}

	@Test
	void cancelamentoSemMotivoEhRecusado() {
		assertThatThrownBy(() -> servico.registrarStatus(70L, new VisitaStatusRequest(StatusVisita.CANCELADA, "  "), 3L))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("observacao"));
		verify(visitas, never()).buscarParaAtualizar(any());
	}

	@Test
	void voltarParaAgendadaNaoEhPermitido() {
		assertThatThrownBy(() -> servico.registrarStatus(70L, new VisitaStatusRequest(StatusVisita.AGENDADA, null), 3L))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("status"));
	}

	@ParameterizedTest
	@EnumSource(value = StatusVisita.class, names = "AGENDADA", mode = EnumSource.Mode.EXCLUDE)
	void statusFinalNaoMuda(StatusVisita atual) {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita(atual, LocalDateTime.now().minusDays(1))));

		assertThatThrownBy(() -> servico.registrarStatus(70L,
				new VisitaStatusRequest(StatusVisita.REALIZADA, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("VISITA_JA_FINALIZADA");
					assertThat(ex.getMessage()).contains(atual.name());
				});
	}

	@Test
	void estudoEncerradoNaoRegistraStatus() {
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
		when(visitas.buscarParaAtualizar(70L))
				.thenReturn(Optional.of(visita(StatusVisita.AGENDADA, LocalDateTime.now().minusDays(1))));

		assertThatThrownBy(() -> servico.registrarStatus(70L,
				new VisitaStatusRequest(StatusVisita.REALIZADA, null), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO"));
	}

	@Test
	void visitaInexistenteNaoEncontrada() {
		when(visitas.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.registrarStatus(99L,
				new VisitaStatusRequest(StatusVisita.AUSENTE, null), 3L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Visita não encontrada");
	}

	// ---- Consultas

	@Test
	void listaDoEstudoComPeriodoInvertidoEhRecusada() {
		when(estudos.existsById(1L)).thenReturn(true);
		LocalDateTime inicio = LocalDate.of(2026, 12, 1).atTime(LocalTime.MIDNIGHT);

		assertThatThrownBy(() -> servico.listarDoEstudo(1L, null, inicio, inicio.minusDays(1)))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> assertThat(ex.getCampo()).isEqualTo("ate"));
	}

	@Test
	void listaDoEstudoRepassaOsFiltros() {
		when(estudos.existsById(1L)).thenReturn(true);
		when(visitas.buscarDoEstudo(1L, StatusVisita.AGENDADA, null, null))
				.thenReturn(List.of(visita(StatusVisita.AGENDADA, NO_DIA)));

		assertThat(servico.listarDoEstudo(1L, StatusVisita.AGENDADA, null, null)).hasSize(1);
	}

	@Test
	void listaDeEstudoInexistenteNaoEncontrada() {
		when(estudos.existsById(9L)).thenReturn(false);

		assertThatThrownBy(() -> servico.listarDoEstudo(9L, null, null, null))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void listaDoParticipanteInexistenteNaoEncontrada() {
		when(candidatos.existsById(9L)).thenReturn(false);

		assertThatThrownBy(() -> servico.listarDoParticipante(9L))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void janelaSemDataDeInclusaoFicaNula() {
		ReflectionTestUtils.setField(participante, "dataInclusao", null);

		assertThat(JanelaVisita.de(participante, prevista)).isNull();
	}

	private void prepararAgendamento() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(visitasPrevistas.findByIdAndEstudoId(20L, 1L)).thenReturn(Optional.of(prevista));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));
	}

	private Visita visita(StatusVisita status, LocalDateTime dataHora) {
		Visita visita = comId(new Visita(participante, prevista, dataHora, null, coordenador), 70L);
		ReflectionTestUtils.setField(visita, "status", status);
		return visita;
	}

	private static Visita comId(Visita visita, Long id) {
		ReflectionTestUtils.setField(visita, "id", id);
		return visita;
	}

}
