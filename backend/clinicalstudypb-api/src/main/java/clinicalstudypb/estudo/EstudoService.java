package clinicalstudypb.estudo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.dto.EstudoRequest;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// RF04: regras de cadastro e edição de estudos
@Service
public class EstudoService {

	private final EstudoRepository repositorio;
	private final UsuarioRepository usuarios;

	public EstudoService(EstudoRepository repositorio, UsuarioRepository usuarios) {
		this.repositorio = repositorio;
		this.usuarios = usuarios;
	}

	@Transactional(readOnly = true)
	public Page<Estudo> listar(EstadoEstudo estado, String busca, Pageable paginacao) {
		return repositorio.findAll(EstudoFiltros.comFiltros(estado, busca), paginacao);
	}

	@Transactional(readOnly = true)
	public Estudo buscar(Long id) {
		return repositorio.findById(id)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Estudo não encontrado"));
	}

	// O estudo sempre nasce no estado PLANEJAMENTO
	@Transactional
	public Estudo criar(EstudoRequest dados) {
		validarPeriodo(dados);
		validarLimite(dados);
		Usuario responsavel = buscarResponsavel(dados.responsavelId());
		Estudo estudo = new Estudo(dados.titulo().trim(), dados.objetivo().trim(), responsavel,
				dados.dataInicio(), dados.dataFim(), dados.limiteParticipantes());
		return repositorio.save(estudo);
	}

	// Edita os dados, sem mudar o estado. Estudo encerrado não pode mais ser alterado.
	@Transactional
	public Estudo atualizar(Long id, EstudoRequest dados) {
		Estudo estudo = buscar(id);
		if (estudo.isEncerrado()) {
			throw new RegraNegocioException("ESTUDO_ENCERRADO", "Estudo encerrado não pode ser editado",
					HttpStatus.CONFLICT);
		}
		validarPeriodo(dados);
		validarLimite(dados);
		Usuario responsavel = buscarResponsavel(dados.responsavelId());
		estudo.atualizarDados(dados.titulo().trim(), dados.objetivo().trim(), responsavel,
				dados.dataInicio(), dados.dataFim(), dados.limiteParticipantes());
		return estudo;
	}

	private static void validarPeriodo(EstudoRequest dados) {
		if (dados.dataFim() != null && dados.dataFim().isBefore(dados.dataInicio())) {
			throw new ValidacaoException("dataFim", "A data de término não pode ser anterior à data de início");
		}
	}

	// O @Min do DTO já barra na API; a regra fica aqui também para valer em qualquer chamada do serviço
	private static void validarLimite(EstudoRequest dados) {
		if (dados.limiteParticipantes() == null || dados.limiteParticipantes() <= 0) {
			throw new ValidacaoException("limiteParticipantes", "O limite de participantes deve ser maior que zero");
		}
	}

	// O responsável precisa ser um usuário ativo com perfil PESQUISADOR
	private Usuario buscarResponsavel(Long responsavelId) {
		Usuario responsavel = usuarios.findById(responsavelId)
				.orElseThrow(() -> new ValidacaoException("responsavelId", "Responsável não encontrado"));
		if (responsavel.getPerfil() != Perfil.PESQUISADOR || !responsavel.isAtivo()) {
			throw new ValidacaoException("responsavelId", "O responsável deve ser um pesquisador ativo");
		}
		return responsavel;
	}

}
