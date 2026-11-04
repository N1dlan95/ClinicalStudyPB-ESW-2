package clinicalstudypb.candidato;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.dto.CandidatoRequest;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoService;

// RF08: regras de cadastro de candidatos vinculados a um estudo
@Service
public class CandidatoService {

	private final CandidatoRepository repositorio;
	private final EstudoService estudos;

	public CandidatoService(CandidatoRepository repositorio, EstudoService estudos) {
		this.repositorio = repositorio;
		this.estudos = estudos;
	}

	@Transactional(readOnly = true)
	public Page<Candidato> listar(Long estudoId, StatusCandidato status, Pageable paginacao) {
		estudos.buscar(estudoId);
		return status == null
				? repositorio.findByEstudoId(estudoId, paginacao)
				: repositorio.findByEstudoIdAndStatus(estudoId, status, paginacao);
	}

	// O candidato precisa pertencer ao estudo da rota; de outro estudo conta como não encontrado
	@Transactional(readOnly = true)
	public Candidato buscar(Long estudoId, Long id) {
		estudos.buscar(estudoId);
		return repositorio.findByIdAndEstudoId(id, estudoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
	}

	// Candidatos só entram enquanto o estudo está em recrutamento; o candidato nasce CADASTRADO
	@Transactional
	public Candidato criar(Long estudoId, CandidatoRequest dados) {
		Estudo estudo = estudos.buscar(estudoId);
		if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO) {
			throw new RegraNegocioException("ESTUDO_FORA_DE_RECRUTAMENTO",
					"Só é possível cadastrar candidatos com o estudo em recrutamento", HttpStatus.CONFLICT);
		}
		String email = normalizarEmail(dados.email());
		if (repositorio.existsByEstudoIdAndEmailIgnoreCase(estudoId, email)) {
			throw emailDuplicado();
		}
		Candidato candidato = new Candidato(estudo, dados.nome().trim(), email,
				normalizarTelefone(dados.telefone()), dados.dataNascimento());
		return repositorio.save(candidato);
	}

	// Edita os dados de contato, sem mudar o status. Estudo encerrado não aceita mais alterações.
	@Transactional
	public Candidato atualizar(Long estudoId, Long id, CandidatoRequest dados) {
		Candidato candidato = buscar(estudoId, id);
		if (candidato.getEstudo().isEncerrado()) {
			throw new RegraNegocioException("ESTUDO_ENCERRADO",
					"Não é possível alterar candidatos de um estudo encerrado", HttpStatus.CONFLICT);
		}
		String email = normalizarEmail(dados.email());
		if (repositorio.existsByEstudoIdAndEmailIgnoreCaseAndIdNot(estudoId, email, id)) {
			throw emailDuplicado();
		}
		candidato.atualizarDados(dados.nome().trim(), email, normalizarTelefone(dados.telefone()),
				dados.dataNascimento());
		return candidato;
	}

	private static String normalizarEmail(String email) {
		return email.trim().toLowerCase();
	}

	private static String normalizarTelefone(String telefone) {
		return telefone == null || telefone.isBlank() ? null : telefone.trim();
	}

	private static RegraNegocioException emailDuplicado() {
		return new RegraNegocioException("EMAIL_DUPLICADO_NO_ESTUDO",
				"Já existe um candidato com este e-mail neste estudo", HttpStatus.CONFLICT);
	}

}
