package clinicalstudypb.candidato;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

import clinicalstudypb.candidato.dto.RetiradaRequest;
import clinicalstudypb.candidato.dto.RetiradaResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visita.VisitaRepository;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// Task 3768 (T-98, RF16): regras da retirada, cancelamento das visitas agendadas e vaga liberada
@ExtendWith(MockitoExtension.class)
class RetiradaServiceTest {

	private static final RetiradaRequest MOTIVO = new RetiradaRequest("  Mudou de cidade ");

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private VisitaRepository visitas;

	@Mock
	private UsuarioRepository usuarios;

	private RetiradaService servico;
	private Estudo estudo;
	private Candidato participante;
	private Usuario coordenador;
	private VisitaPrevista prevista;

	@BeforeEach
	void configurar() {
		servico = new RetiradaService(candidatos, visitas, usuarios);
		estudo = new Estudo("Estudo", "Objetivo",
				new Usuario("Ana", "ana@teste.com", null, Perfil.PESQUISADOR, "hash"), LocalDate.of(2026, 11, 1), null, 10);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.EXECUCAO);
		participante = new Candidato(estudo, "João Silva", "joao@teste.com", null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(participante, "id", 5L);
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.INCLUIDO);
		coordenador = new Usuario("Carlos", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
		ReflectionTestUtils.setField(coordenador, "id", 3L);
		prevista = new VisitaPrevista(estudo, 1, "Retorno", 30, 3, null);
	}

	@Test
	void retiraCancelaAsAgendadasELiberaAVaga() {
		Visita primeira = new Visita(participante, prevista, LocalDateTime.of(2026, 12, 1, 9, 0), null, coordenador);
		Visita segunda = new Visita(participante, prevista, LocalDateTime.of(2026, 12, 30, 9, 0), null, coordenador);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));
		when(visitas.findByParticipanteIdAndStatus(5L, StatusVisita.AGENDADA)).thenReturn(List.of(primeira, segunda));
		when(candidatos.countByEstudoIdAndStatus(1L, StatusCandidato.INCLUIDO)).thenReturn(3L);

		RetiradaResponse resposta = servico.retirar(5L, MOTIVO, 3L);

		assertThat(participante.getStatus()).isEqualTo(StatusCandidato.RETIRADO);
		assertThat(participante.getMotivoRetirada()).isEqualTo("Mudou de cidade");
		assertThat(participante.getRetiradaRegistradaPor()).isSameAs(coordenador);
		assertThat(participante.getRetiradaRegistradaEm()).isNotNull();
		assertThat(List.of(primeira, segunda)).allSatisfy(visita -> {
			assertThat(visita.getStatus()).isEqualTo(StatusVisita.CANCELADA);
			assertThat(visita.getObservacao()).isEqualTo("Retirada do participante");
			assertThat(visita.getStatusRegistradoPor()).isSameAs(coordenador);
		});
		assertThat(resposta.visitasCanceladas()).isEqualTo(2);
		assertThat(resposta.vagasOcupadas()).isEqualTo(3L);
		assertThat(resposta.limiteParticipantes()).isEqualTo(10);
		assertThat(resposta.candidato().status()).isEqualTo(StatusCandidato.RETIRADO);
		assertThat(resposta.candidato().retirada().registradaPor()).isEqualTo("Carlos");
		assertThat(resposta.candidato().retirada().motivo()).isEqualTo("Mudou de cidade");
	}

	@Test
	void semVisitasAgendadasNenhumaEhCancelada() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));
		when(visitas.findByParticipanteIdAndStatus(5L, StatusVisita.AGENDADA)).thenReturn(List.of());

		assertThat(servico.retirar(5L, MOTIVO, 3L).visitasCanceladas()).isZero();
	}

	@Test
	void participanteJaRetiradoEhRecusado() {
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.RETIRADO);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.retirar(5L, MOTIVO, 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("PARTICIPANTE_JA_RETIRADO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(visitas, never()).findByParticipanteIdAndStatus(any(), any());
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = { "CADASTRADO", "ELEGIVEL", "INELEGIVEL" })
	void soParticipanteIncluidoPodeSerRetirado(StatusCandidato status) {
		ReflectionTestUtils.setField(participante, "status", status);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.retirar(5L, MOTIVO, 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("PARTICIPANTE_NAO_INCLUIDO"));
		assertThat(participante.getStatus()).isEqualTo(status);
	}

	@Test
	void estudoEncerradoNaoRetira() {
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));

		assertThatThrownBy(() -> servico.retirar(5L, MOTIVO, 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO"));
		assertThat(participante.getStatus()).isEqualTo(StatusCandidato.INCLUIDO);
	}

	@Test
	void participanteInexistenteNaoEncontrado() {
		when(candidatos.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.retirar(99L, MOTIVO, 3L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Participante não encontrado");
	}

	@Test
	void responsavelInexistenteRetornaNaoAutenticado() {
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(participante));
		when(usuarios.findById(3L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.retirar(5L, MOTIVO, 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
		assertThat(participante.getStatus()).isEqualTo(StatusCandidato.INCLUIDO);
	}

}
