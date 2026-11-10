package clinicalstudypb.candidato;

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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.candidato.dto.CandidatoRequest;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoService;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

@ExtendWith(MockitoExtension.class)
class CandidatoServiceTest {

	private static final LocalDate NASCIMENTO = LocalDate.of(1990, 5, 20);

	@Mock
	private CandidatoRepository repositorio;

	@Mock
	private EstudoService estudos;

	private CandidatoService servico;

	@BeforeEach
	void configurar() {
		servico = new CandidatoService(repositorio, estudos);
	}

	// ---- Cadastro

	@Test
	void criarComEstudoEmRecrutamentoNasceCadastrado() {
		Estudo estudo = estudo(1L, EstadoEstudo.RECRUTAMENTO);
		when(estudos.buscar(1L)).thenReturn(estudo);
		when(repositorio.existsByEstudoIdAndEmailIgnoreCase(1L, "joao@teste.com")).thenReturn(false);
		when(repositorio.save(any(Candidato.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Candidato criado = servico.criar(1L, dados(" João Silva ", " Joao@Teste.COM ", " "));

		assertThat(criado.getStatus()).isEqualTo(StatusCandidato.CADASTRADO);
		assertThat(criado.getEstudo()).isSameAs(estudo);
		assertThat(criado.getNome()).isEqualTo("João Silva");
		assertThat(criado.getEmail()).isEqualTo("joao@teste.com");
		assertThat(criado.getTelefone()).isNull();
		assertThat(criado.getUsuario()).isNull();
	}

	@ParameterizedTest
	@EnumSource(value = EstadoEstudo.class, names = "RECRUTAMENTO", mode = EnumSource.Mode.EXCLUDE)
	void criarComEstudoForaDeRecrutamentoGeraConflito(EstadoEstudo estado) {
		when(estudos.buscar(1L)).thenReturn(estudo(1L, estado));

		assertThatThrownBy(() -> servico.criar(1L, dados("João Silva", "joao@teste.com", null)))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DE_RECRUTAMENTO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(repositorio, never()).save(any());
	}

	@Test
	void criarComEmailJaCadastradoNoEstudoGeraConflito() {
		when(estudos.buscar(1L)).thenReturn(estudo(1L, EstadoEstudo.RECRUTAMENTO));
		when(repositorio.existsByEstudoIdAndEmailIgnoreCase(1L, "joao@teste.com")).thenReturn(true);

		assertThatThrownBy(() -> servico.criar(1L, dados("João Silva", "JOAO@teste.com", null)))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("EMAIL_DUPLICADO_NO_ESTUDO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(repositorio, never()).save(any());
	}

	@Test
	void mesmoEmailEmOutroEstudoEPermitido() {
		// A unicidade é por estudo: a consulta usa o id do estudo da rota
		when(estudos.buscar(2L)).thenReturn(estudo(2L, EstadoEstudo.RECRUTAMENTO));
		when(repositorio.existsByEstudoIdAndEmailIgnoreCase(2L, "joao@teste.com")).thenReturn(false);
		when(repositorio.save(any(Candidato.class))).thenAnswer(chamada -> chamada.getArgument(0));

		assertThat(servico.criar(2L, dados("João Silva", "joao@teste.com", null)).getEmail())
				.isEqualTo("joao@teste.com");
	}

	@Test
	void criarEmEstudoInexistenteLancaNaoEncontrado() {
		when(estudos.buscar(99L)).thenThrow(new RecursoNaoEncontradoException("Estudo não encontrado"));

		assertThatThrownBy(() -> servico.criar(99L, dados("João Silva", "joao@teste.com", null)))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	// ---- Edição

	@Test
	void atualizarAlteraOsDadosSemMudarOStatus() {
		Candidato existente = candidato(5L, estudo(1L, EstadoEstudo.EXECUCAO), StatusCandidato.ELEGIVEL);
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));
		when(repositorio.existsByEstudoIdAndEmailIgnoreCaseAndIdNot(1L, "novo@teste.com", 5L)).thenReturn(false);

		Candidato atualizado = servico.atualizar(1L, 5L, dados("João Souza", "Novo@teste.com", "(83) 99999-0000"));

		assertThat(atualizado.getNome()).isEqualTo("João Souza");
		assertThat(atualizado.getEmail()).isEqualTo("novo@teste.com");
		assertThat(atualizado.getTelefone()).isEqualTo("(83) 99999-0000");
		assertThat(atualizado.getStatus()).isEqualTo(StatusCandidato.ELEGIVEL);
	}

	@Test
	void atualizarComEmailDeOutroCandidatoDoEstudoGeraConflito() {
		Candidato existente = candidato(5L, estudo(1L, EstadoEstudo.RECRUTAMENTO), StatusCandidato.CADASTRADO);
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));
		when(repositorio.existsByEstudoIdAndEmailIgnoreCaseAndIdNot(1L, "outro@teste.com", 5L)).thenReturn(true);

		assertThatThrownBy(() -> servico.atualizar(1L, 5L, dados("João Silva", "outro@teste.com", null)))
				.isInstanceOf(RegraNegocioException.class)
				.hasMessage("Já existe um candidato com este e-mail neste estudo");
	}

	@Test
	void atualizarCandidatoDeEstudoEncerradoGeraConflito() {
		Candidato existente = candidato(5L, estudo(1L, EstadoEstudo.ENCERRADO), StatusCandidato.INCLUIDO);
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.of(existente));

		assertThatThrownBy(() -> servico.atualizar(1L, 5L, dados("João Silva", "joao@teste.com", null)))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_ENCERRADO"));
	}

	// ---- Consulta

	@Test
	void buscarCandidatoDeOutroEstudoLancaNaoEncontrado() {
		when(repositorio.findByIdAndEstudoId(5L, 1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.buscar(1L, 5L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Candidato não encontrado");
	}

	@Test
	void listarSemFiltroTrazTodosOsCandidatosDoEstudo() {
		var paginacao = PageRequest.of(0, 20);
		Page<Candidato> pagina = new PageImpl<>(List.of(), paginacao, 0);
		when(repositorio.findByEstudoId(1L, paginacao)).thenReturn(pagina);

		assertThat(servico.listar(1L, null, paginacao)).isSameAs(pagina);
		verify(estudos).buscar(1L);
	}

	@Test
	void listarComFiltroDeStatus() {
		var paginacao = PageRequest.of(0, 20);
		Page<Candidato> pagina = new PageImpl<>(List.of(), paginacao, 0);
		when(repositorio.findByEstudoIdAndStatus(1L, StatusCandidato.ELEGIVEL, paginacao)).thenReturn(pagina);

		assertThat(servico.listar(1L, StatusCandidato.ELEGIVEL, paginacao)).isSameAs(pagina);
	}

	@Test
	void listarDeEstudoInexistenteLancaNaoEncontrado() {
		when(estudos.buscar(99L)).thenThrow(new RecursoNaoEncontradoException("Estudo não encontrado"));

		assertThatThrownBy(() -> servico.listar(99L, null, PageRequest.of(0, 20)))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	private static CandidatoRequest dados(String nome, String email, String telefone) {
		return new CandidatoRequest(nome, email, telefone, NASCIMENTO);
	}

	static Estudo estudo(Long id, EstadoEstudo estado) {
		Usuario pesquisadora = new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
		Estudo estudo = new Estudo("Estudo de hipertensão", "Objetivo", pesquisadora,
				LocalDate.of(2026, 11, 1), null, 30);
		ReflectionTestUtils.setField(estudo, "id", id);
		ReflectionTestUtils.setField(estudo, "estado", estado);
		return estudo;
	}

	static Candidato candidato(Long id, Estudo estudo, StatusCandidato status) {
		Candidato candidato = new Candidato(estudo, "João Silva", "joao@teste.com", null, NASCIMENTO);
		ReflectionTestUtils.setField(candidato, "id", id);
		ReflectionTestUtils.setField(candidato, "status", status);
		return candidato;
	}

}
