package clinicalstudypb.visita;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.dto.ResultadosRequest;
import clinicalstudypb.visita.dto.ResultadosResponse;
import clinicalstudypb.visitaprevista.Atividade;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// Task 3763 (T-94, RF14): regras dos resultados das atividades da visita
@ExtendWith(MockitoExtension.class)
class ResultadoServiceTest {

	@Mock
	private VisitaRepository visitas;

	@Mock
	private ResultadoAtividadeRepository resultados;

	@Mock
	private UsuarioRepository usuarios;

	private ResultadoService servico;
	private Estudo estudo;
	private Visita visita;
	private Atividade pressao;
	private Atividade glicemia;
	private Usuario coordenador;

	@BeforeEach
	void configurar() {
		servico = new ResultadoService(visitas, resultados, usuarios);
		estudo = new Estudo("Estudo", "Objetivo",
				new Usuario("Ana", "ana@teste.com", null, Perfil.PESQUISADOR, "hash"), LocalDate.of(2026, 11, 1), null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.EXECUCAO);
		Candidato participante = new Candidato(estudo, "João Silva", "joao@teste.com", null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(participante, "id", 5L);
		ReflectionTestUtils.setField(participante, "status", StatusCandidato.INCLUIDO);
		VisitaPrevista prevista = new VisitaPrevista(estudo, 1, "Visita inicial", 0, null, null);
		ReflectionTestUtils.setField(prevista, "id", 20L);
		pressao = new Atividade(1, "Aferir pressão arterial");
		glicemia = new Atividade(2, "Coletar glicemia");
		prevista.substituirAtividades(List.of(pressao, glicemia));
		ReflectionTestUtils.setField(pressao, "id", 40L);
		ReflectionTestUtils.setField(glicemia, "id", 41L);
		coordenador = new Usuario("Carlos", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
		ReflectionTestUtils.setField(coordenador, "id", 3L);
		visita = new Visita(participante, prevista, LocalDateTime.of(2026, 11, 1, 9, 0), null, coordenador);
		ReflectionTestUtils.setField(visita, "id", 70L);
		ReflectionTestUtils.setField(visita, "status", StatusVisita.REALIZADA);
	}

	// ---- Consulta

	@Test
	void listaTodasAsAtividadesNaOrdemComOResultadoOuVazio() {
		when(visitas.buscar(70L)).thenReturn(Optional.of(visita));
		when(resultados.findByVisitaId(70L))
				.thenReturn(List.of(new ResultadoAtividade(visita, glicemia, "92 mg/dL", null, coordenador)));

		ResultadosResponse resposta = servico.listar(70L);

		assertThat(resposta.visitaId()).isEqualTo(70L);
		assertThat(resposta.status()).isEqualTo(StatusVisita.REALIZADA);
		assertThat(resposta.itens()).extracting(ResultadosResponse.Item::atividadeId).containsExactly(40L, 41L);
		assertThat(resposta.itens().get(0).resultado()).isNull();
		assertThat(resposta.itens().get(0).registradoPor()).isNull();
		assertThat(resposta.itens().get(1).resultado()).isEqualTo("92 mg/dL");
		assertThat(resposta.itens().get(1).registradoPor()).isEqualTo("Carlos");
		assertThat(resposta.itens().get(1).registradoEm()).isNotNull();
	}

	@Test
	void listaDeVisitaInexistenteNaoEncontrada() {
		when(visitas.buscar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.listar(99L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Visita não encontrada");
	}

	// ---- Registro

	@Test
	void registraNovosResultadosComQuemEQuando() {
		prepararRegistro(List.of());
		when(resultados.save(any(ResultadoAtividade.class))).thenAnswer(chamada -> chamada.getArgument(0));

		ResultadosResponse resposta = servico.registrar(70L, new ResultadosRequest(List.of(
				new ResultadosRequest.Item(40L, "  PA 120x80 ", null),
				new ResultadosRequest.Item(41L, "92 mg/dL", "  Em jejum "))), 3L);

		assertThat(resposta.itens()).extracting(ResultadosResponse.Item::resultado)
				.containsExactly("PA 120x80", "92 mg/dL");
		assertThat(resposta.itens().get(1).observacao()).isEqualTo("Em jejum");
		assertThat(resposta.itens()).allSatisfy(item -> {
			assertThat(item.registradoPor()).isEqualTo("Carlos");
			assertThat(item.registradoEm()).isNotNull();
		});
		verify(resultados, times(2)).save(any(ResultadoAtividade.class));
	}

	@Test
	void resultadoExistenteEhSubstituidoSemCriarOutro() {
		ResultadoAtividade existente = new ResultadoAtividade(visita, pressao, "PA 130x90", "Antigo", coordenador);
		prepararRegistro(List.of(existente));

		ResultadosResponse resposta = servico.registrar(70L,
				new ResultadosRequest(List.of(new ResultadosRequest.Item(40L, "PA 120x80", "  "))), 3L);

		assertThat(existente.getResultado()).isEqualTo("PA 120x80");
		assertThat(existente.getObservacao()).isNull();
		assertThat(resposta.itens().get(0).resultado()).isEqualTo("PA 120x80");
		assertThat(resposta.itens().get(1).resultado()).isNull();
		verify(resultados, never()).save(any());
	}

	@ParameterizedTest
	@EnumSource(value = StatusVisita.class, names = "REALIZADA", mode = EnumSource.Mode.EXCLUDE)
	void soVisitaRealizadaRecebeResultado(StatusVisita status) {
		ReflectionTestUtils.setField(visita, "status", status);
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.registrar(70L, umResultado(40L), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("VISITA_NAO_REALIZADA");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(resultados, never()).save(any());
	}

	@Test
	void estudoEncerradoNaoAceitaAlteracao() {
		ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.registrar(70L, umResultado(40L), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO"));
	}

	@Test
	void atividadeDeOutraVisitaNaoGravaNada() {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.registrar(70L, new ResultadosRequest(List.of(
				new ResultadosRequest.Item(40L, "PA 120x80", null),
				new ResultadosRequest.Item(99L, "Outro", null))), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ATIVIDADE_FORA_DA_VISITA");
					assertThat(ex.getMessage()).isEqualTo("A atividade 99 não pertence à visita \"Visita inicial\"");
				});
		verify(resultados, never()).save(any());
	}

	@Test
	void mesmaAtividadeDuasVezesEhRecusada() {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));

		assertThatThrownBy(() -> servico.registrar(70L, new ResultadosRequest(List.of(
				new ResultadosRequest.Item(40L, "PA 120x80", null),
				new ResultadosRequest.Item(40L, "PA 110x70", null))), 3L))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> assertThat(ex.getCampo()).isEqualTo("itens"));
		verify(resultados, never()).save(any());
	}

	@Test
	void registroEmVisitaInexistenteNaoEncontrado() {
		when(visitas.buscarParaAtualizar(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.registrar(99L, umResultado(40L), 3L))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void responsavelInexistenteRetornaNaoAutenticado() {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));
		when(usuarios.findById(3L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.registrar(70L, umResultado(40L), 3L))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
	}

	private void prepararRegistro(List<ResultadoAtividade> existentes) {
		when(visitas.buscarParaAtualizar(70L)).thenReturn(Optional.of(visita));
		when(usuarios.findById(3L)).thenReturn(Optional.of(coordenador));
		when(resultados.findByVisitaId(70L)).thenReturn(existentes);
	}

	private static ResultadosRequest umResultado(Long atividadeId) {
		return new ResultadosRequest(List.of(new ResultadosRequest.Item(atividadeId, "PA 120x80", null)));
	}

}
