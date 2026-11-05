package clinicalstudypb.visitaprevista;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoService;
import clinicalstudypb.visitaprevista.dto.AtividadeRequest;
import clinicalstudypb.visitaprevista.dto.VisitaPrevistaRequest;

@Service
public class VisitaPrevistaService {

	private final VisitaPrevistaRepository repositorio;
	private final EstudoService estudos;

	public VisitaPrevistaService(VisitaPrevistaRepository repositorio, EstudoService estudos) {
		this.repositorio = repositorio;
		this.estudos = estudos;
	}

	@Transactional(readOnly = true)
	public List<VisitaPrevista> listar(Long estudoId) {
		estudos.buscar(estudoId);
		return repositorio.findByEstudoIdOrderByOrdemAsc(estudoId);
	}

	@Transactional(readOnly = true)
	public VisitaPrevista buscar(Long estudoId, Long id) {
		estudos.buscar(estudoId);
		return repositorio.findByIdAndEstudoId(id, estudoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita prevista não encontrada"));
	}

	@Transactional
	public VisitaPrevista criar(Long estudoId, VisitaPrevistaRequest dados) {
		Estudo estudo = estudos.buscar(estudoId);
		validarOrdens(dados);
		if (repositorio.existsByEstudoIdAndOrdem(estudoId, dados.ordem())) {
			throw ordemRepetida("estudoId", "Já existe uma visita prevista com esta ordem no estudo");
		}
		VisitaPrevista visita = new VisitaPrevista(estudo, dados.ordem(), dados.nome().trim(),
				dados.diaPrevisto(), dados.janelaDias(), normalizarDescricao(dados.descricao()));
		visita.substituirAtividades(criarAtividades(dados.atividades()));
		return repositorio.save(visita);
	}

	@Transactional
	public VisitaPrevista atualizar(Long estudoId, Long id, VisitaPrevistaRequest dados) {
		VisitaPrevista visita = buscar(estudoId, id);
		validarOrdens(dados);
		if (repositorio.existsByEstudoIdAndOrdemAndIdNot(estudoId, dados.ordem(), id)) {
			throw ordemRepetida("ordem", "Já existe uma visita prevista com esta ordem no estudo");
		}
		visita.atualizarDados(dados.ordem(), dados.nome().trim(), dados.diaPrevisto(), dados.janelaDias(),
				normalizarDescricao(dados.descricao()));
		visita.substituirAtividades(criarAtividades(dados.atividades()));
		return visita;
	}

	@Transactional
	public void excluir(Long estudoId, Long id) {
		repositorio.delete(buscar(estudoId, id));
	}

	private static void validarOrdens(VisitaPrevistaRequest dados) {
		if (dados.diaPrevisto() != null && dados.diaPrevisto() < 0) {
			throw new ValidacaoException("diaPrevisto", "O dia previsto não pode ser negativo");
		}
		if (dados.janelaDias() != null && dados.janelaDias() < 0) {
			throw new ValidacaoException("janelaDias", "A janela de dias não pode ser negativa");
		}
		List<AtividadeRequest> atividades = dados.atividades() == null ? List.of() : dados.atividades();
		Set<Integer> ordens = new HashSet<>();
		for (AtividadeRequest atividade : atividades) {
			if (atividade.ordem() == null) {
				throw new ValidacaoException("atividades.ordem", "A ordem da atividade é obrigatória");
			}
			if (atividade.ordem() != null && atividade.ordem() <= 0) {
				throw new ValidacaoException("atividades.ordem", "A ordem das atividades deve ser maior que zero");
			}
			if (!ordens.add(atividade.ordem())) {
				throw ordemRepetida("atividades.ordem", "A ordem das atividades não pode se repetir na visita");
			}
			if (atividade.descricao() == null || atividade.descricao().isBlank()) {
				throw new ValidacaoException("atividades.descricao", "A descrição da atividade é obrigatória");
			}
		}
	}

	private static List<Atividade> criarAtividades(List<AtividadeRequest> dados) {
		if (dados == null) {
			return List.of();
		}
		return dados.stream()
				.map(atividade -> new Atividade(atividade.ordem(), atividade.descricao().trim()))
				.toList();
	}

	private static String normalizarDescricao(String descricao) {
		return descricao == null || descricao.isBlank() ? null : descricao.trim();
	}

	private static RegraNegocioException ordemRepetida(String campo, String mensagem) {
		return new RegraNegocioException("ORDEM_DUPLICADA", mensagem, HttpStatus.CONFLICT);
	}
}
