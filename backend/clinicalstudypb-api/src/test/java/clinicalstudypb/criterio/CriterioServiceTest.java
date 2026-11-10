package clinicalstudypb.criterio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.criterio.dto.CriterioRequest;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

@ExtendWith(MockitoExtension.class)
class CriterioServiceTest {

	@Mock
	private CriterioRepository repositorio;

	@Mock
	private EstudoRepository estudos;

	private CriterioService servico;

	private Estudo estudo;

	@BeforeEach
	void configurar() {
		servico = new CriterioService(repositorio, estudos);
		estudo = estudo(EstadoEstudo.PLANEJAMENTO);
	}

	// ---- Cadastro

	@Test
	void criarSemOrdemVaiParaOFimDaListaDoTipo() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.maiorOrdem(1L, TipoCriterio.INCLUSAO)).thenReturn(2);
		when(repositorio.save(any(Criterio.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Criterio criado = servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "  Idade acima de 18 anos ", null));

		assertThat(criado.getOrdem()).isEqualTo(3);
		assertThat(criado.getDescricao()).isEqualTo("Idade acima de 18 anos");
		assertThat(criado.getTipo()).isEqualTo(TipoCriterio.INCLUSAO);
		assertThat(criado.getEstudo()).isSameAs(estudo);
	}

	@Test
	void criarComOrdemInformadaUsaAOrdemDoPedido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.existsByEstudoIdAndTipoAndOrdem(1L, TipoCriterio.EXCLUSAO, 5)).thenReturn(false);
		when(repositorio.save(any(Criterio.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Criterio criado = servico.criar(1L, new CriterioRequest(TipoCriterio.EXCLUSAO, "Gestante", 5));

		assertThat(criado.getOrdem()).isEqualTo(5);
	}

	@Test
	void criarComOrdemJaUsadaGeraConflito() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.existsByEstudoIdAndTipoAndOrdem(1L, TipoCriterio.INCLUSAO, 1)).thenReturn(true);

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "Diagnóstico confirmado", 1)))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ORDEM_DUPLICADA");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(repositorio, never()).save(any());
	}

	@ParameterizedTest
	@EnumSource(value = EstadoEstudo.class, names = "PLANEJAMENTO", mode = EnumSource.Mode.EXCLUDE)
	void criarComEstudoForaDoPlanejamentoGeraConflito(EstadoEstudo estado) {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo(estado)));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", null)))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DO_PLANEJAMENTO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarEmEstudoInexistenteLancaNaoEncontrado() {
		when(estudos.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.criar(99L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", null)))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Estudo não encontrado");
	}

	@Test
	void criarComDescricaoCurtaDepoisDoTrimEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "  ab  ", null)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("descricao"));
	}

	@Test
	void criarComOrdemZeroEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", 0)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("ordem"));
	}

	@Test
	void criarSemTipoEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(null, "Maior de idade", null)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("tipo"));
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarSemDescricaoEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, null, null)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("descricao"));
	}

	@Test
	void criarComDescricaoAcimaDe500CaracteresEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "a".repeat(501), null)))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> {
					assertThat(ex.getCampo()).isEqualTo("descricao");
					assertThat(ex.getMessage()).isEqualTo("A descrição deve ter entre 3 e 500 caracteres");
				});
	}

	@Test
	void criarComDescricaoDeExatos500CaracteresEPermitido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.maiorOrdem(1L, TipoCriterio.INCLUSAO)).thenReturn(0);
		when(repositorio.save(any(Criterio.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Criterio criado = servico.criar(1L, new CriterioRequest(TipoCriterio.INCLUSAO, "a".repeat(500), null));

		assertThat(criado.getDescricao()).hasSize(500);
		assertThat(criado.getOrdem()).isEqualTo(1);
	}

	// ---- Edição

	@Test
	void atualizarComOrdemZeroEInvalido() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));

		assertThatThrownBy(() -> servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", 0)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("ordem"));
		verify(repositorio, never()).findByIdAndEstudoId(any(), any());
	}

	@Test
	void atualizarMantendoAPropriaOrdemNaoGeraConflito() {
		Criterio existente = criterio(5L, TipoCriterio.INCLUSAO, "Maior de idade", 3);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));
		when(repositorio.existsByEstudoIdAndTipoAndOrdemAndIdNot(1L, TipoCriterio.INCLUSAO, 3, 5L)).thenReturn(false);

		Criterio atualizado = servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de 18 anos", 3));

		assertThat(atualizado.getOrdem()).isEqualTo(3);
		assertThat(atualizado.getDescricao()).isEqualTo("Maior de 18 anos");
	}

	@Test
	void atualizarAlteraOsDadosEMantemAOrdemQuandoNaoVem() {
		Criterio existente = criterio(5L, TipoCriterio.INCLUSAO, "Descrição antiga", 3);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));

		Criterio atualizado = servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.INCLUSAO, " Nova descrição ", null));

		assertThat(atualizado.getDescricao()).isEqualTo("Nova descrição");
		assertThat(atualizado.getOrdem()).isEqualTo(3);
	}

	@Test
	void atualizarMudandoDeTipoSemOrdemVaiParaOFimDoNovoTipo() {
		Criterio existente = criterio(5L, TipoCriterio.INCLUSAO, "Gestante", 1);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));
		when(repositorio.maiorOrdem(1L, TipoCriterio.EXCLUSAO)).thenReturn(4);

		Criterio atualizado = servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.EXCLUSAO, "Gestante", null));

		assertThat(atualizado.getTipo()).isEqualTo(TipoCriterio.EXCLUSAO);
		assertThat(atualizado.getOrdem()).isEqualTo(5);
	}

	@Test
	void atualizarComOrdemDeOutroCriterioGeraConflito() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L))
				.thenReturn(Optional.of(criterio(5L, TipoCriterio.INCLUSAO, "Maior de idade", 2)));
		when(repositorio.existsByEstudoIdAndTipoAndOrdemAndIdNot(1L, TipoCriterio.INCLUSAO, 1, 5L)).thenReturn(true);

		assertThatThrownBy(() -> servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", 1)))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ORDEM_DUPLICADA"));
	}

	@Test
	void atualizarCriterioInexistenteLancaNaoEncontrado() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(99L, 1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.atualizar(1L, 99L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", null)))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Critério não encontrado");
	}

	@Test
	void atualizarComEstudoEmRecrutamentoGeraConflito() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo(EstadoEstudo.RECRUTAMENTO)));

		assertThatThrownBy(() -> servico.atualizar(1L, 5L, new CriterioRequest(TipoCriterio.INCLUSAO, "Maior de idade", null)))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DO_PLANEJAMENTO"));
	}

	// ---- Remoção

	@Test
	void removerExcluiOCriterio() {
		Criterio existente = criterio(5L, TipoCriterio.INCLUSAO, "Maior de idade", 1);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));

		servico.remover(1L, 5L);

		verify(repositorio).delete(existente);
		verify(repositorio).flush();
	}

	@Test
	void removerCriterioJaUsadoEmAvaliacaoGeraConflito() {
		Criterio existente = criterio(5L, TipoCriterio.INCLUSAO, "Maior de idade", 1);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));
		doThrow(new DataIntegrityViolationException("fk")).when(repositorio).flush();

		assertThatThrownBy(() -> servico.remover(1L, 5L))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("CRITERIO_EM_USO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
	}

	@Test
	void removerComEstudoForaDoPlanejamentoGeraConflito() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo(EstadoEstudo.EXECUCAO)));

		assertThatThrownBy(() -> servico.remover(1L, 5L)).isInstanceOf(RegraNegocioException.class);
		verify(repositorio, never()).delete(any());
	}

	@Test
	void removerCriterioInexistenteLancaNaoEncontrado() {
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByIdAndEstudoId(99L, 1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.remover(1L, 99L)).isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void removerEmEstudoInexistenteLancaNaoEncontrado() {
		when(estudos.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.remover(99L, 5L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Estudo não encontrado");
		verify(repositorio, never()).delete(any());
	}

	// ---- Consulta

	@Test
	void listarTrazInclusaoPrimeiroEOrdenaPelaOrdem() {
		Criterio exclusao1 = criterio(1L, TipoCriterio.EXCLUSAO, "Gestante", 1);
		Criterio inclusao2 = criterio(2L, TipoCriterio.INCLUSAO, "Diagnóstico confirmado", 2);
		Criterio inclusao1 = criterio(3L, TipoCriterio.INCLUSAO, "Maior de idade", 1);
		when(estudos.findById(1L)).thenReturn(Optional.of(estudo));
		when(repositorio.findByEstudoId(1L)).thenReturn(List.of(exclusao1, inclusao2, inclusao1));

		assertThat(servico.listar(1L)).containsExactly(inclusao1, inclusao2, exclusao1);
	}

	@Test
	void listarEstudoInexistenteLancaNaoEncontrado() {
		when(estudos.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.listar(99L)).isInstanceOf(RecursoNaoEncontradoException.class);
	}

	private static Estudo estudo(EstadoEstudo estado) {
		Usuario ana = new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
		ReflectionTestUtils.setField(ana, "id", 2L);
		Estudo estudo = new Estudo("Estudo de hipertensão", "Objetivo", ana, LocalDate.of(2026, 11, 1), null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", estado);
		return estudo;
	}

	private Criterio criterio(Long id, TipoCriterio tipo, String descricao, int ordem) {
		Criterio criterio = new Criterio(estudo, tipo, descricao, ordem);
		ReflectionTestUtils.setField(criterio, "id", id);
		return criterio;
	}

}
