package clinicalstudypb.participante;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.participante.dto.EstudoDoParticipanteResponse;
import clinicalstudypb.participante.dto.VisitaDoParticipanteResponse;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visita.VisitaRepository;
import clinicalstudypb.visitaprevista.VisitaPrevista;

@ExtendWith(MockitoExtension.class)
class ParticipanteServiceTest {

	private static final Long ANA = 40L;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private VisitaRepository visitas;

	private ParticipanteService servico;

	private Usuario pesquisadora;

	@BeforeEach
	void configurar() {
		servico = new ParticipanteService(candidatos, visitas);
		pesquisadora = new Usuario("Ana Pesquisadora", "pesq@teste.com", null, Perfil.PESQUISADOR, "hash");
	}

	@Test
	void estudosVemDasMaisRecentesParaAsMaisAntigasComAProximaVisita() {
		Candidato antiga = participacao(7L, estudo(1L, "Estudo antigo"), StatusCandidato.RETIRADO, LocalDate.of(2026, 6, 1));
		Candidato atual = participacao(8L, estudo(2L, "Estudo atual"), StatusCandidato.INCLUIDO, LocalDate.of(2026, 11, 1));
		when(candidatos.findByUsuarioIdAndStatusIn(eq(ANA), anyCollection())).thenReturn(List.of(antiga, atual));
		Visita proxima = visita(13L, atual, "Retorno de 30 dias", LocalDateTime.of(2026, 12, 1, 9, 0), StatusVisita.AGENDADA);
		when(visitas.findFirstByParticipanteIdAndStatusAndDataHoraGreaterThanEqualOrderByDataHoraAsc(eq(8L),
				eq(StatusVisita.AGENDADA), any())).thenReturn(Optional.of(proxima));
		when(visitas.findFirstByParticipanteIdAndStatusAndDataHoraGreaterThanEqualOrderByDataHoraAsc(eq(7L),
				eq(StatusVisita.AGENDADA), any())).thenReturn(Optional.empty());

		List<EstudoDoParticipanteResponse> estudos = servico.estudos(ANA);

		assertThat(estudos).extracting(EstudoDoParticipanteResponse::titulo).containsExactly("Estudo atual", "Estudo antigo");
		EstudoDoParticipanteResponse primeiro = estudos.get(0);
		assertThat(primeiro.responsavel()).isEqualTo("Ana Pesquisadora");
		assertThat(primeiro.candidatoId()).isEqualTo(8L);
		assertThat(primeiro.participacao()).isEqualTo(StatusCandidato.INCLUIDO);
		assertThat(primeiro.proximaVisita().nome()).isEqualTo("Retorno de 30 dias");
		assertThat(estudos.get(1).proximaVisita()).isNull();
	}

	@Test
	void participacaoSemDataDeInclusaoVaiParaOFim() {
		Candidato semData = participacao(5L, estudo(1L, "Sem data"), StatusCandidato.INCLUIDO, null);
		Candidato comData = participacao(6L, estudo(2L, "Com data"), StatusCandidato.INCLUIDO, LocalDate.of(2026, 1, 1));
		when(candidatos.findByUsuarioIdAndStatusIn(eq(ANA), anyCollection())).thenReturn(List.of(semData, comData));
		when(visitas.findFirstByParticipanteIdAndStatusAndDataHoraGreaterThanEqualOrderByDataHoraAsc(any(), any(), any()))
				.thenReturn(Optional.empty());

		assertThat(servico.estudos(ANA)).extracting(EstudoDoParticipanteResponse::titulo)
				.containsExactly("Com data", "Sem data");
	}

	@Test
	@SuppressWarnings("unchecked")
	void buscaSoAsParticipacoesIncluidasERetiradas() {
		when(candidatos.findByUsuarioIdAndStatusIn(eq(ANA), anyCollection())).thenAnswer(chamada -> {
			assertThat((java.util.Collection<StatusCandidato>) chamada.getArgument(1))
					.containsExactlyInAnyOrder(StatusCandidato.INCLUIDO, StatusCandidato.RETIRADO);
			return List.of();
		});

		assertThat(servico.estudos(ANA)).isEmpty();
	}

	@Test
	@SuppressWarnings("unchecked")
	void visitasDoAppNaoIncluemAsCanceladas() {
		Candidato atual = participacao(8L, estudo(2L, "Estudo atual"), StatusCandidato.INCLUIDO, LocalDate.of(2026, 11, 1));
		Visita realizada = visita(12L, atual, "Visita inicial", LocalDateTime.of(2026, 11, 2, 9, 0), StatusVisita.REALIZADA);
		when(visitas.buscarDaConta(eq(ANA), anyCollection())).thenAnswer(chamada -> {
			assertThat((java.util.Collection<StatusVisita>) chamada.getArgument(1))
					.containsExactlyInAnyOrder(StatusVisita.AGENDADA, StatusVisita.REALIZADA, StatusVisita.AUSENTE);
			return List.of(realizada);
		});

		List<VisitaDoParticipanteResponse> resultado = servico.visitas(ANA);

		assertThat(resultado).singleElement().satisfies(visita -> {
			assertThat(visita.id()).isEqualTo(12L);
			assertThat(visita.estudoId()).isEqualTo(2L);
			assertThat(visita.estudoTitulo()).isEqualTo("Estudo atual");
			assertThat(visita.nome()).isEqualTo("Visita inicial");
			assertThat(visita.local()).isEqualTo("Sala 2");
			assertThat(visita.status()).isEqualTo(StatusVisita.REALIZADA);
		});
	}

	private Estudo estudo(Long id, String titulo) {
		Estudo estudo = new Estudo(titulo, "Objetivo", pesquisadora, LocalDate.of(2026, 1, 1), null, 10);
		ReflectionTestUtils.setField(estudo, "id", id);
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.EXECUCAO);
		return estudo;
	}

	private static Candidato participacao(Long id, Estudo estudo, StatusCandidato status, LocalDate dataInclusao) {
		Candidato candidato = new Candidato(estudo, "Ana Participante", "ana" + id + "@teste.com", null,
				LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(candidato, "id", id);
		ReflectionTestUtils.setField(candidato, "status", status);
		ReflectionTestUtils.setField(candidato, "dataInclusao", dataInclusao);
		return candidato;
	}

	private Visita visita(Long id, Candidato participante, String nome, LocalDateTime dataHora, StatusVisita status) {
		VisitaPrevista prevista = new VisitaPrevista(participante.getEstudo(), 1, nome, 0, 2, null);
		Visita visita = new Visita(participante, prevista, dataHora, "Sala 2", pesquisadora);
		ReflectionTestUtils.setField(visita, "id", id);
		ReflectionTestUtils.setField(visita, "status", status);
		return visita;
	}

}
