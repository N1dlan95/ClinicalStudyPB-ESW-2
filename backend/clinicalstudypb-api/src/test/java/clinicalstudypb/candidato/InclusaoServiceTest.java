package clinicalstudypb.candidato;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import clinicalstudypb.candidato.dto.InclusaoResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

// RF11 / task 3568: limite de vagas, consentimento, elegibilidade e estado do estudo
@ExtendWith(MockitoExtension.class)
class InclusaoServiceTest {

	private static final int LIMITE = 30;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private EstudoRepository estudos;

	private InclusaoService servico;

	@BeforeEach
	void configurar() {
		servico = new InclusaoService(candidatos, estudos);
	}

	// ---- Inclusão com sucesso

	@Test
	void incluiCandidatoElegivelComConsentimentoEVaga() {
		Candidato candidato = prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.ELEGIVEL, true);
		when(candidatos.countByEstudoIdAndStatus(1L, StatusCandidato.INCLUIDO)).thenReturn(4L);

		InclusaoResponse resposta = servico.incluir(5L);

		assertThat(candidato.getStatus()).isEqualTo(StatusCandidato.INCLUIDO);
		assertThat(candidato.getDataInclusao()).isEqualTo(LocalDate.now());
		assertThat(resposta.vagasOcupadas()).isEqualTo(5);
		assertThat(resposta.limiteParticipantes()).isEqualTo(LIMITE);
	}

	@Test
	void aUltimaVagaAindaPodeSerOcupada() {
		Candidato candidato = prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.ELEGIVEL, true);
		when(candidatos.countByEstudoIdAndStatus(1L, StatusCandidato.INCLUIDO)).thenReturn(LIMITE - 1L);

		InclusaoResponse resposta = servico.incluir(5L);

		assertThat(candidato.getStatus()).isEqualTo(StatusCandidato.INCLUIDO);
		assertThat(resposta.vagasOcupadas()).isEqualTo(LIMITE);
	}

	// ---- Bloqueios

	@Test
	void vagasEsgotadasGeraConflito() {
		Candidato candidato = prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.ELEGIVEL, true);
		when(candidatos.countByEstudoIdAndStatus(1L, StatusCandidato.INCLUIDO)).thenReturn((long) LIMITE);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("VAGAS_ESGOTADAS");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		assertThat(candidato.getStatus()).isEqualTo(StatusCandidato.ELEGIVEL);
		assertThat(candidato.getDataInclusao()).isNull();
	}

	@Test
	void semConsentimentoGeraConflito() {
		prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.ELEGIVEL, false);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CONSENTIMENTO_NAO_REGISTRADO"));
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = "ELEGIVEL", mode = EnumSource.Mode.EXCLUDE)
	void candidatoNaoElegivelGeraConflito(StatusCandidato status) {
		prepararCandidato(EstadoEstudo.RECRUTAMENTO, status, true);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CANDIDATO_NAO_ELEGIVEL"));
	}

	@ParameterizedTest
	@EnumSource(value = EstadoEstudo.class, names = "RECRUTAMENTO", mode = EnumSource.Mode.EXCLUDE)
	void estudoForaDeRecrutamentoGeraConflito(EstadoEstudo estado) {
		prepararCandidato(estado, StatusCandidato.ELEGIVEL, true);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	// ---- Ordem das validações: com tudo errado, vale a primeira regra da task

	@Test
	void estadoDoEstudoEConferidoAntesDaElegibilidade() {
		prepararCandidato(EstadoEstudo.PLANEJAMENTO, StatusCandidato.CADASTRADO, false);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	@Test
	void elegibilidadeEConferidaAntesDoConsentimento() {
		prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.INELEGIVEL, false);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CANDIDATO_NAO_ELEGIVEL"));
	}

	@Test
	void consentimentoEConferidoAntesDasVagas() {
		prepararCandidato(EstadoEstudo.RECRUTAMENTO, StatusCandidato.ELEGIVEL, false);

		assertThatThrownBy(() -> servico.incluir(5L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CONSENTIMENTO_NAO_REGISTRADO"));
		verify(candidatos, never()).countByEstudoIdAndStatus(any(), any());
	}

	@Test
	void candidatoInexistenteLancaNaoEncontrado() {
		when(candidatos.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.incluir(99L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Candidato não encontrado");
	}

	private Candidato prepararCandidato(EstadoEstudo estado, StatusCandidato status, boolean comConsentimento) {
		Estudo estudo = CandidatoServiceTest.estudo(1L, estado);
		Candidato candidato = CandidatoServiceTest.candidato(5L, estudo, status);
		if (comConsentimento) {
			candidato.registrarConsentimento(new Usuario("Carlos", "carlos@teste.com", null, Perfil.COORDENADOR, "hash"));
		}
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(candidato));
		when(estudos.buscarParaAtualizar(1L)).thenReturn(Optional.of(estudo));
		return candidato;
	}

}
