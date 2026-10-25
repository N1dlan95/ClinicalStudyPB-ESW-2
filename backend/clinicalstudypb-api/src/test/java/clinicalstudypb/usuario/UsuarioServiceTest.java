package clinicalstudypb.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.usuario.dto.UsuarioAtualizacaoRequest;
import clinicalstudypb.usuario.dto.UsuarioCriacaoRequest;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

	@Mock
	private UsuarioRepository repositorio;

	@Mock
	private PasswordEncoder codificadorSenha;

	private UsuarioService servico;

	@BeforeEach
	void configurar() {
		servico = new UsuarioService(repositorio, codificadorSenha);
	}

	@Test
	void criarGuardaSenhaCodificadaEEmailNormalizado() {
		var dados = new UsuarioCriacaoRequest("  Ana Souza ", " Ana@Teste.COM ", " ", Perfil.PESQUISADOR, "senha1234");
		when(repositorio.existsByEmailIgnoreCase("ana@teste.com")).thenReturn(false);
		when(codificadorSenha.encode("senha1234")).thenReturn("hash");
		when(repositorio.save(any(Usuario.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Usuario criado = servico.criar(dados);

		assertThat(criado.getNome()).isEqualTo("Ana Souza");
		assertThat(criado.getEmail()).isEqualTo("ana@teste.com");
		assertThat(criado.getMatricula()).isNull();
		assertThat(criado.getPerfil()).isEqualTo(Perfil.PESQUISADOR);
		assertThat(criado.getSenhaHash()).isEqualTo("hash");
		assertThat(criado.isAtivo()).isTrue();
	}

	@Test
	void criarComEmailJaCadastradoLancaConflito() {
		var dados = new UsuarioCriacaoRequest("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "senha1234");
		when(repositorio.existsByEmailIgnoreCase("ana@teste.com")).thenReturn(true);

		assertThatThrownBy(() -> servico.criar(dados))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("EMAIL_DUPLICADO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		verify(repositorio, never()).save(any());
	}

	@Test
	void atualizarAlteraDadosSemMexerNaSenhaNemNoAtivo() {
		Usuario existente = usuario();
		existente.definirAtivo(false);
		when(repositorio.findById(1L)).thenReturn(Optional.of(existente));
		when(repositorio.existsByEmailIgnoreCaseAndIdNot("novo@teste.com", 1L)).thenReturn(false);

		Usuario atualizado = servico.atualizar(1L,
				new UsuarioAtualizacaoRequest("Ana Lima", "Novo@Teste.com", "M-01", Perfil.COORDENADOR));

		assertThat(atualizado.getNome()).isEqualTo("Ana Lima");
		assertThat(atualizado.getEmail()).isEqualTo("novo@teste.com");
		assertThat(atualizado.getMatricula()).isEqualTo("M-01");
		assertThat(atualizado.getPerfil()).isEqualTo(Perfil.COORDENADOR);
		assertThat(atualizado.getSenhaHash()).isEqualTo("hash");
		assertThat(atualizado.isAtivo()).isFalse();
	}

	@Test
	void atualizarComEmailDeOutroUsuarioLancaConflito() {
		when(repositorio.findById(1L)).thenReturn(Optional.of(usuario()));
		when(repositorio.existsByEmailIgnoreCaseAndIdNot("outro@teste.com", 1L)).thenReturn(true);

		assertThatThrownBy(() -> servico.atualizar(1L,
				new UsuarioAtualizacaoRequest("Ana Souza", "outro@teste.com", null, Perfil.PESQUISADOR)))
				.isInstanceOf(RegraNegocioException.class)
				.hasMessage("Já existe um usuário com este e-mail");
	}

	@Test
	void buscarInexistenteLancaNaoEncontrado() {
		when(repositorio.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.buscar(99L))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void alterarAtivoDesativaEReativa() {
		Usuario existente = usuario();
		when(repositorio.findById(1L)).thenReturn(Optional.of(existente));

		assertThat(servico.alterarAtivo(1L, false).isAtivo()).isFalse();
		assertThat(servico.alterarAtivo(1L, true).isAtivo()).isTrue();
	}

	@Test
	@SuppressWarnings("unchecked")
	void listarRepassaAPaginacaoAoRepositorio() {
		var paginacao = PageRequest.of(0, 20);
		Page<Usuario> pagina = new PageImpl<>(List.of(usuario()), paginacao, 1);
		when(repositorio.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(pagina);

		assertThat(servico.listar(Perfil.PESQUISADOR, true, "ana", paginacao)).isSameAs(pagina);
	}

	@Test
	void listarPerfisRetornaOsQuatroPerfis() {
		assertThat(servico.listarPerfis()).containsExactly(
				Perfil.ADMINISTRADOR, Perfil.PESQUISADOR, Perfil.COORDENADOR, Perfil.PARTICIPANTE);
	}

	private static Usuario usuario() {
		return new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
	}

}
