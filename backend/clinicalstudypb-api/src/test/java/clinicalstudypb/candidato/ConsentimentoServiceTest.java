package clinicalstudypb.candidato;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class ConsentimentoServiceTest {

	private static final Long COORDENADOR_ID = 3L;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private UsuarioRepository usuarios;

	private ConsentimentoService servico;

	private Usuario coordenador;

	@BeforeEach
	void configurar() {
		servico = new ConsentimentoService(candidatos, usuarios);
		coordenador = new Usuario("Carlos Coordenador", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
	}

	@Test
	void registraQuemConsentiuEQuandoParaCandidatoElegivel() {
		Candidato candidato = prepararCandidato(StatusCandidato.ELEGIVEL);
		when(usuarios.findById(COORDENADOR_ID)).thenReturn(Optional.of(coordenador));

		CandidatoResponse resposta = servico.registrar(5L, COORDENADOR_ID);

		assertThat(candidato.isConsentimentoRegistrado()).isTrue();
		assertThat(candidato.getConsentimentoRegistradoPor()).isSameAs(coordenador);
		assertThat(resposta.consentimento().registradoPor()).isEqualTo("Carlos Coordenador");
		assertThat(resposta.consentimento().registradoEm()).isNotNull();
		assertThat(resposta.status()).isEqualTo(StatusCandidato.ELEGIVEL);
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = "ELEGIVEL", mode = EnumSource.Mode.EXCLUDE)
	void candidatoNaoElegivelGeraConflito(StatusCandidato status) {
		Candidato candidato = prepararCandidato(status);

		assertThatThrownBy(() -> servico.registrar(5L, COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("CANDIDATO_NAO_ELEGIVEL");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		assertThat(candidato.isConsentimentoRegistrado()).isFalse();
	}

	@Test
	void segundoRegistroGeraConflitoSemTrocarOPrimeiro() {
		Candidato candidato = prepararCandidato(StatusCandidato.ELEGIVEL);
		candidato.registrarConsentimento(coordenador);
		var registradoEm = candidato.getConsentimentoRegistradoEm();

		assertThatThrownBy(() -> servico.registrar(5L, COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CONSENTIMENTO_JA_REGISTRADO"));
		assertThat(candidato.getConsentimentoRegistradoEm()).isEqualTo(registradoEm);
		verifyNoInteractions(usuarios);
	}

	@Test
	void estudoEncerradoGeraConflitoSemRegistrar() {
		Candidato candidato = CandidatoServiceTest.candidato(5L,
				CandidatoServiceTest.estudo(1L, EstadoEstudo.ENCERRADO), StatusCandidato.ELEGIVEL);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(candidato));

		assertThatThrownBy(() -> servico.registrar(5L, COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		assertThat(candidato.isConsentimentoRegistrado()).isFalse();
		verifyNoInteractions(usuarios);
	}

	@Test
	void candidatoInexistenteLancaNaoEncontrado() {
		when(candidatos.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.registrar(99L, COORDENADOR_ID))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Candidato não encontrado");
	}

	@Test
	void usuarioDoTokenInexistenteRetornaNaoAutenticado() {
		prepararCandidato(StatusCandidato.ELEGIVEL);
		when(usuarios.findById(COORDENADOR_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.registrar(5L, COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
	}

	private Candidato prepararCandidato(StatusCandidato status) {
		Candidato candidato = CandidatoServiceTest.candidato(5L,
				CandidatoServiceTest.estudo(1L, EstadoEstudo.RECRUTAMENTO), status);
		when(candidatos.buscarParaAtualizar(5L)).thenReturn(Optional.of(candidato));
		return candidato;
	}

}
