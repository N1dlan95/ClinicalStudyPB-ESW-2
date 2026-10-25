package clinicalstudypb.usuario;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.usuario.dto.UsuarioAtualizacaoRequest;
import clinicalstudypb.usuario.dto.UsuarioCriacaoRequest;

// RF01: regras de cadastro e gestão de usuários
@Service
public class UsuarioService {

	private final UsuarioRepository repositorio;
	private final PasswordEncoder codificadorSenha;

	public UsuarioService(UsuarioRepository repositorio, PasswordEncoder codificadorSenha) {
		this.repositorio = repositorio;
		this.codificadorSenha = codificadorSenha;
	}

	@Transactional(readOnly = true)
	public Page<Usuario> listar(Perfil perfil, Boolean ativo, String busca, Pageable paginacao) {
		return repositorio.findAll(UsuarioFiltros.comFiltros(perfil, ativo, busca), paginacao);
	}

	@Transactional(readOnly = true)
	public Usuario buscar(Long id) {
		return repositorio.findById(id)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));
	}

	@Transactional
	public Usuario criar(UsuarioCriacaoRequest dados) {
		String email = normalizarEmail(dados.email());
		if (repositorio.existsByEmailIgnoreCase(email)) {
			throw emailDuplicado();
		}
		Usuario usuario = new Usuario(
				dados.nome().trim(),
				email,
				normalizarMatricula(dados.matricula()),
				dados.perfil(),
				codificadorSenha.encode(dados.senha()));
		return repositorio.save(usuario);
	}

	@Transactional
	public Usuario atualizar(Long id, UsuarioAtualizacaoRequest dados) {
		Usuario usuario = buscar(id);
		String email = normalizarEmail(dados.email());
		if (repositorio.existsByEmailIgnoreCaseAndIdNot(email, id)) {
			throw emailDuplicado();
		}
		usuario.atualizarDados(dados.nome().trim(), email, normalizarMatricula(dados.matricula()), dados.perfil());
		return usuario;
	}

	// Usuário desativado não consegue fazer login (verificado na autenticação)
	@Transactional
	public Usuario alterarAtivo(Long id, boolean ativo) {
		Usuario usuario = buscar(id);
		usuario.definirAtivo(ativo);
		return usuario;
	}

	public List<Perfil> listarPerfis() {
		return List.of(Perfil.values());
	}

	private static String normalizarEmail(String email) {
		return email.trim().toLowerCase();
	}

	private static String normalizarMatricula(String matricula) {
		return matricula == null || matricula.isBlank() ? null : matricula.trim();
	}

	private static RegraNegocioException emailDuplicado() {
		return new RegraNegocioException("EMAIL_DUPLICADO", "Já existe um usuário com este e-mail", HttpStatus.CONFLICT);
	}

}
