package clinicalstudypb.criterio;

import java.util.Comparator;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.criterio.dto.CriterioRequest;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;

// RF05: critérios de inclusão e exclusão do estudo. Só mudam enquanto o estudo está em PLANEJAMENTO.
@Service
public class CriterioService {

	private final CriterioRepository repositorio;
	private final EstudoRepository estudos;

	public CriterioService(CriterioRepository repositorio, EstudoRepository estudos) {
		this.repositorio = repositorio;
		this.estudos = estudos;
	}

	// Inclusão primeiro, depois exclusão; dentro de cada tipo, pela ordem
	@Transactional(readOnly = true)
	public List<Criterio> listar(Long estudoId) {
		buscarEstudo(estudoId);
		return repositorio.findByEstudoId(estudoId).stream()
				.sorted(Comparator.comparing(Criterio::getTipo).thenComparingInt(Criterio::getOrdem))
				.toList();
	}

	@Transactional
	public Criterio criar(Long estudoId, CriterioRequest dados) {
		Estudo estudo = buscarEstudoEmPlanejamento(estudoId);
		validar(dados);
		int ordem;
		if (dados.ordem() == null) {
			ordem = repositorio.maiorOrdem(estudoId, dados.tipo()) + 1;
		} else {
			ordem = dados.ordem();
			if (repositorio.existsByEstudoIdAndTipoAndOrdem(estudoId, dados.tipo(), ordem)) {
				throw ordemDuplicada();
			}
		}
		return repositorio.save(new Criterio(estudo, dados.tipo(), dados.descricao().trim(), ordem));
	}

	@Transactional
	public Criterio atualizar(Long estudoId, Long id, CriterioRequest dados) {
		buscarEstudoEmPlanejamento(estudoId);
		validar(dados);
		Criterio criterio = buscarCriterio(estudoId, id);
		int ordem;
		if (dados.ordem() == null) {
			// Sem ordem no pedido: mantém a atual; se mudou de tipo, vai para o fim da lista do novo tipo
			ordem = criterio.getTipo() == dados.tipo()
					? criterio.getOrdem()
					: repositorio.maiorOrdem(estudoId, dados.tipo()) + 1;
		} else {
			ordem = dados.ordem();
			if (repositorio.existsByEstudoIdAndTipoAndOrdemAndIdNot(estudoId, dados.tipo(), ordem, id)) {
				throw ordemDuplicada();
			}
		}
		criterio.atualizar(dados.tipo(), dados.descricao().trim(), ordem);
		return criterio;
	}

	// Critério já usado em avaliação de candidato não pode ser removido (RF05): o banco recusa pela chave estrangeira
	@Transactional
	public void remover(Long estudoId, Long id) {
		buscarEstudoEmPlanejamento(estudoId);
		Criterio criterio = buscarCriterio(estudoId, id);
		try {
			repositorio.delete(criterio);
			repositorio.flush();
		} catch (DataIntegrityViolationException ex) {
			throw new RegraNegocioException("CRITERIO_EM_USO",
					"O critério já foi usado em avaliações de candidatos e não pode ser removido", HttpStatus.CONFLICT);
		}
	}

	private Estudo buscarEstudo(Long estudoId) {
		return estudos.findById(estudoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Estudo não encontrado"));
	}

	private Estudo buscarEstudoEmPlanejamento(Long estudoId) {
		Estudo estudo = buscarEstudo(estudoId);
		if (estudo.getEstado() != EstadoEstudo.PLANEJAMENTO) {
			throw new RegraNegocioException("ESTUDO_FORA_DO_PLANEJAMENTO",
					"Os critérios só podem ser alterados enquanto o estudo está em planejamento", HttpStatus.CONFLICT);
		}
		return estudo;
	}

	private Criterio buscarCriterio(Long estudoId, Long id) {
		return repositorio.findByIdAndEstudoId(id, estudoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Critério não encontrado"));
	}

	// As anotações do DTO já barram na API; as regras ficam aqui também para valer em qualquer chamada do serviço
	private static void validar(CriterioRequest dados) {
		if (dados.tipo() == null) {
			throw new ValidacaoException("tipo", "O tipo é obrigatório");
		}
		if (dados.descricao() == null || dados.descricao().trim().length() < 3
				|| dados.descricao().trim().length() > 500) {
			throw new ValidacaoException("descricao", "A descrição deve ter entre 3 e 500 caracteres");
		}
		if (dados.ordem() != null && dados.ordem() <= 0) {
			throw new ValidacaoException("ordem", "A ordem deve ser maior que zero");
		}
	}

	private static RegraNegocioException ordemDuplicada() {
		return new RegraNegocioException("ORDEM_DUPLICADA",
				"Já existe um critério desse tipo com essa ordem neste estudo", HttpStatus.CONFLICT);
	}

}
