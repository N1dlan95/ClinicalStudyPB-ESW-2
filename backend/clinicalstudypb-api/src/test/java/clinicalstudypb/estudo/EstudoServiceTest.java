package clinicalstudypb.estudo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.dto.EstudoRequest;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class EstudoServiceTest {

	private static final LocalDate INICIO = LocalDate.of(2026, 11, 1);

	@Mock
	private EstudoRepository repositorio;

	@Mock
	private UsuarioRepository usuarios;

	private EstudoService servico;

	private Usuario pesquisadora;

	@BeforeEach
	void configurar() {
		servico = new EstudoService(repositorio, usuarios);
		pesquisadora = usuario(2L, Perfil.PESQUISADOR);
	}

	// ---- Cadastro

	@Test
	void criarEstudoNasceEmPlanejamento() {
		when(usuarios.findById(2L)).thenReturn(Optional.of(pesquisadora));
		when(repositorio.save(any(Estudo.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Estudo criado = servico.criar(dados(INICIO, INICIO.plusMonths(6), 30));

		assertThat(criado.getEstado()).isEqualTo(EstadoEstudo.PLANEJAMENTO);
		assertThat(criado.getTitulo()).isEqualTo("Estudo de hipertensão");
		assertThat(criado.getResponsavel()).isSameAs(pesquisadora);
		assertThat(criado.getLimiteParticipantes()).isEqualTo(30);
	}

	@Test
	void criarSemDataDeTerminoEPermitido() {
		when(usuarios.findById(2L)).thenReturn(Optional.of(pesquisadora));
		when(repositorio.save(any(Estudo.class))).thenAnswer(chamada -> chamada.getArgument(0));

		assertThat(servico.criar(dados(INICIO, null, 10)).getDataFim()).isNull();
	}

	@Test
	void criarComTerminoNoMesmoDiaDoInicioEPermitido() {
		when(usuarios.findById(2L)).thenReturn(Optional.of(pesquisadora));
		when(repositorio.save(any(Estudo.class))).thenAnswer(chamada -> chamada.getArgument(0));

		assertThat(servico.criar(dados(INICIO, INICIO, 10)).getDataFim()).isEqualTo(INICIO);
	}

	@Test
	void criarComTerminoAntesDoInicioEInvalido() {
		assertThatThrownBy(() -> servico.criar(dados(INICIO, INICIO.minusDays(1), 10)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("dataFim"));
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarComLimiteZeroEInvalido() {
		assertThatThrownBy(() -> servico.criar(dados(INICIO, null, 0)))
				.isInstanceOfSatisfying(ValidacaoException.class,
						ex -> assertThat(ex.getCampo()).isEqualTo("limiteParticipantes"));
	}

	@Test
	void criarComLimiteNegativoEInvalido() {
		assertThatThrownBy(() -> servico.criar(dados(INICIO, null, -5)))
				.isInstanceOf(ValidacaoException.class);
	}

	@Test
	void criarComResponsavelInexistenteEInvalido() {
		when(usuarios.findById(2L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.criar(dados(INICIO, null, 10)))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> {
					assertThat(ex.getCampo()).isEqualTo("responsavelId");
					assertThat(ex.getMessage()).isEqualTo("Responsável não encontrado");
				});
	}

	@Test
	void criarComResponsavelQueNaoEPesquisadorEInvalido() {
		when(usuarios.findById(2L)).thenReturn(Optional.of(usuario(2L, Perfil.COORDENADOR)));

		assertThatThrownBy(() -> servico.criar(dados(INICIO, null, 10)))
				.isInstanceOf(ValidacaoException.class)
				.hasMessage("O responsável deve ser um pesquisador ativo");
	}

	@Test
	void criarComPesquisadorInativoEInvalido() {
		pesquisadora.definirAtivo(false);
		when(usuarios.findById(2L)).thenReturn(Optional.of(pesquisadora));

		assertThatThrownBy(() -> servico.criar(dados(INICIO, null, 10)))
				.isInstanceOf(ValidacaoException.class)
				.hasMessage("O responsável deve ser um pesquisador ativo");
	}

	// ---- Edição

	@Test
	void atualizarAlteraOsDadosSemMudarOEstado() {
		Estudo existente = estudo(EstadoEstudo.RECRUTAMENTO);
		Usuario outraPesquisadora = usuario(3L, Perfil.PESQUISADOR);
		when(repositorio.findById(1L)).thenReturn(Optional.of(existente));
		when(usuarios.findById(3L)).thenReturn(Optional.of(outraPesquisadora));

		Estudo atualizado = servico.atualizar(1L, new EstudoRequest("Novo título", "Novo objetivo", 3L,
				INICIO.plusDays(10), INICIO.plusYears(1), 50));

		assertThat(atualizado.getTitulo()).isEqualTo("Novo título");
		assertThat(atualizado.getResponsavel()).isSameAs(outraPesquisadora);
		assertThat(atualizado.getLimiteParticipantes()).isEqualTo(50);
		assertThat(atualizado.getEstado()).isEqualTo(EstadoEstudo.RECRUTAMENTO);
	}

	@Test
	void atualizarEstudoEncerradoGeraConflito() {
		when(repositorio.findById(1L)).thenReturn(Optional.of(estudo(EstadoEstudo.ENCERRADO)));

		assertThatThrownBy(() -> servico.atualizar(1L, dados(INICIO, null, 10)))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
	}

	@Test
	void atualizarComDatasInvalidasEInvalido() {
		when(repositorio.findById(1L)).thenReturn(Optional.of(estudo(EstadoEstudo.PLANEJAMENTO)));

		assertThatThrownBy(() -> servico.atualizar(1L, dados(INICIO, INICIO.minusMonths(1), 10)))
				.isInstanceOf(ValidacaoException.class);
	}

	@Test
	void atualizarEstudoInexistenteLancaNaoEncontrado() {
		when(repositorio.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.atualizar(99L, dados(INICIO, null, 10)))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	// ---- Consulta

	@Test
	void buscarInexistenteLancaNaoEncontrado() {
		when(repositorio.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.buscar(99L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Estudo não encontrado");
	}

	@Test
	@SuppressWarnings("unchecked")
	void listarRepassaAPaginacaoAoRepositorio() {
		var paginacao = PageRequest.of(0, 20);
		Page<Estudo> pagina = new PageImpl<>(List.of(estudo(EstadoEstudo.PLANEJAMENTO)), paginacao, 1);
		when(repositorio.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(pagina);

		assertThat(servico.listar(EstadoEstudo.PLANEJAMENTO, "hiper", paginacao)).isSameAs(pagina);
	}

	private static EstudoRequest dados(LocalDate inicio, LocalDate fim, Integer limite) {
		return new EstudoRequest(" Estudo de hipertensão ", "Avaliar adesão ao tratamento", 2L, inicio, fim, limite);
	}

	private Estudo estudo(EstadoEstudo estado) {
		Estudo estudo = new Estudo("Estudo de hipertensão", "Objetivo", pesquisadora, INICIO, null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", estado);
		return estudo;
	}

	private static Usuario usuario(Long id, Perfil perfil) {
		Usuario usuario = new Usuario("Ana Souza", "ana" + id + "@teste.com", null, perfil, "hash");
		ReflectionTestUtils.setField(usuario, "id", id);
		return usuario;
	}

}
