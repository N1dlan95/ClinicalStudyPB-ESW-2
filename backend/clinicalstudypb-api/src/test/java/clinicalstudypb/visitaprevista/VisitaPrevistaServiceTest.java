package clinicalstudypb.visitaprevista;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoService;
import clinicalstudypb.visitaprevista.dto.AtividadeRequest;
import clinicalstudypb.visitaprevista.dto.VisitaPrevistaRequest;

@ExtendWith(MockitoExtension.class)
class VisitaPrevistaServiceTest {

	@Mock
	private VisitaPrevistaRepository repositorio;

	@Mock
	private EstudoService estudos;

	@Mock
	private EntityManager entityManager;

	private VisitaPrevistaService servico;
	private Estudo estudo;

	@BeforeEach
	void configurar() {
		servico = new VisitaPrevistaService(repositorio, estudos, entityManager);
		estudo = mock(Estudo.class);
		ReflectionTestUtils.setField(estudo, "id", 1L);
	}

	@Test
	void listarBuscaEstudoEListaEmOrdem() {
		VisitaPrevista visita = visita(1L, 1);
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByEstudoIdOrderByOrdemAsc(1L)).thenReturn(List.of(visita));

		assertThat(servico.listar(1L)).containsExactly(visita);
	}

	@Test
	void criarVinculaEstudoEAtividades() {
		VisitaPrevistaRequest dados = dados(1, List.of(
				new AtividadeRequest(2, " Coleta de sangue "),
				new AtividadeRequest(1, "Consentimento")));
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.save(any())).thenAnswer(chamada -> chamada.getArgument(0));

		VisitaPrevista criada = servico.criar(1L, dados);

		assertThat(criada.getEstudo()).isSameAs(estudo);
		assertThat(criada.getNome()).isEqualTo("Visita de triagem");
		assertThat(criada.getAtividades()).hasSize(2);
		assertThat(criada.getAtividades().get(0).getDescricao()).isEqualTo("Coleta de sangue");
		assertThat(criada.getAtividades().get(0).getVisitaPrevista()).isSameAs(criada);
	}

	@Test
	void criarComOrdemRepetidaNoEstudoFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.existsByEstudoIdAndOrdem(1L, 1)).thenReturn(true);

		assertThatThrownBy(() -> servico.criar(1L, dados(1, List.of())))
				.isInstanceOf(RegraNegocioException.class)
				.hasMessageContaining("ordem");
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarComAtividadesDeOrdemRepetidaFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);

		assertThatThrownBy(() -> servico.criar(1L, dados(1, List.of(
				new AtividadeRequest(1, "Primeira"),
				new AtividadeRequest(1, "Segunda")))))
				.isInstanceOf(RegraNegocioException.class)
				.hasMessageContaining("não pode se repetir");
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarComAtividadeSemDescricaoFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);

		assertThatThrownBy(() -> servico.criar(1L, dados(1, List.of(new AtividadeRequest(1, " ")))))
				.isInstanceOf(ValidacaoException.class);
	}

	@Test
	void criarComDiaNegativoFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		VisitaPrevistaRequest dados = new VisitaPrevistaRequest(1, "Visita de triagem", -1, null, null, List.of());

		assertThatThrownBy(() -> servico.criar(1L, dados))
				.isInstanceOf(ValidacaoException.class);
	}

	@Test
	void atualizarAlteraDadosESubstituiAtividades() {
		VisitaPrevista existente = visita(1L, 1);
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(1L, 1L)).thenReturn(Optional.of(existente));
		when(repositorio.existsByEstudoIdAndOrdemAndIdNot(1L, 2, 1L)).thenReturn(false);

		VisitaPrevista atualizada = servico.atualizar(1L, 1L,
				dados(2, List.of(new AtividadeRequest(1, "Nova atividade"))));

		assertThat(atualizada.getOrdem()).isEqualTo(2);
		assertThat(atualizada.getAtividades()).hasSize(1);
		assertThat(atualizada.getAtividades().get(0).getDescricao()).isEqualTo("Nova atividade");
	}

	@Test
	void atualizarComOrdemRepetidaFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(1L, 1L)).thenReturn(Optional.of(visita(1L, 1)));
		when(repositorio.existsByEstudoIdAndOrdemAndIdNot(1L, 2, 1L)).thenReturn(true);

		assertThatThrownBy(() -> servico.atualizar(1L, 1L, dados(2, List.of())))
				.isInstanceOf(RegraNegocioException.class);
	}

	@Test
	void buscarInexistenteLancaNaoEncontrado() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(99L, 1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.buscar(1L, 99L))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void excluirBuscaERemove() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(1L, 1L)).thenReturn(Optional.of(visita(1L, 1)));

		servico.excluir(1L, 1L);

		verify(repositorio).delete(any(VisitaPrevista.class));
	}

	@Test
	void criarEmEstudoEncerradoFalha() {
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(estudo.isEncerrado()).thenReturn(true);

		assertThatThrownBy(() -> servico.criar(1L, dados(1, List.of())))
				.isInstanceOf(RegraNegocioException.class)
				.satisfies(erro -> {
					RegraNegocioException excecao = (RegraNegocioException) erro;
					assertThat(excecao.getCodigo()).isEqualTo("ESTUDO_ENCERRADO");
					assertThat(excecao.getStatus()).isEqualTo(HttpStatus.CONFLICT);
					assertThat(excecao.getMessage()).isEqualTo(
							"Não é possível alterar visitas previstas de um estudo encerrado");
				});
		verify(repositorio, never()).save(any());
	}

	@Test
	void atualizarEmEstudoEncerradoFalha() {
		VisitaPrevista existente = visita(1L, 1);
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(1L, 1L)).thenReturn(Optional.of(existente));
		when(estudo.isEncerrado()).thenReturn(true);

		assertThatThrownBy(() -> servico.atualizar(1L, 1L, dados(1, List.of())))
				.isInstanceOf(RegraNegocioException.class)
				.satisfies(erro -> {
					RegraNegocioException excecao = (RegraNegocioException) erro;
					assertThat(excecao.getCodigo()).isEqualTo("ESTUDO_ENCERRADO");
					assertThat(excecao.getStatus()).isEqualTo(HttpStatus.CONFLICT);
					assertThat(excecao.getMessage()).isEqualTo(
							"Não é possível alterar visitas previstas de um estudo encerrado");
				});
		verify(entityManager, never()).flush();
	}

	@Test
	void excluirEmEstudoEncerradoFalha() {
		VisitaPrevista existente = visita(1L, 1);
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.findByIdAndEstudoId(1L, 1L)).thenReturn(Optional.of(existente));
		when(estudo.isEncerrado()).thenReturn(true);

		assertThatThrownBy(() -> servico.excluir(1L, 1L))
				.isInstanceOf(RegraNegocioException.class)
				.satisfies(erro -> {
					RegraNegocioException excecao = (RegraNegocioException) erro;
					assertThat(excecao.getCodigo()).isEqualTo("ESTUDO_ENCERRADO");
					assertThat(excecao.getStatus()).isEqualTo(HttpStatus.CONFLICT);
					assertThat(excecao.getMessage()).isEqualTo(
							"Não é possível alterar visitas previstas de um estudo encerrado");
				});
		verify(repositorio, never()).delete(any());
	}

	private static VisitaPrevistaRequest dados(int ordem, List<AtividadeRequest> atividades) {
		return new VisitaPrevistaRequest(ordem, " Visita de triagem ", 0, 2, " Avaliação inicial ", atividades);
	}

	private VisitaPrevista visita(Long id, int ordem) {
		VisitaPrevista visita = new VisitaPrevista(estudo, ordem, "Visita de triagem", 0, null, null);
		ReflectionTestUtils.setField(visita, "id", id);
		return visita;
	}
}
