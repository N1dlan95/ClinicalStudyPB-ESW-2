package clinicalstudypb.avaliacao;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.avaliacao.dto.AvaliacaoRequest;
import clinicalstudypb.avaliacao.dto.AvaliacaoResponse;
import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.criterio.Criterio;
import clinicalstudypb.criterio.CriterioRepository;
import clinicalstudypb.criterio.TipoCriterio;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// RF09: avaliação de elegibilidade critério por critério
@Service
public class AvaliacaoService {

	// Inclusão primeiro, depois exclusão, cada grupo na ordem definida pelo pesquisador
	private static final Comparator<Criterio> ORDEM_DOS_CRITERIOS =
			Comparator.comparing(Criterio::getTipo).thenComparingInt(Criterio::getOrdem);

	private final CandidatoRepository candidatos;
	private final CriterioRepository criterios;
	private final AvaliacaoCriterioRepository avaliacoes;
	private final UsuarioRepository usuarios;

	public AvaliacaoService(CandidatoRepository candidatos, CriterioRepository criterios,
			AvaliacaoCriterioRepository avaliacoes, UsuarioRepository usuarios) {
		this.candidatos = candidatos;
		this.criterios = criterios;
		this.avaliacoes = avaliacoes;
		this.usuarios = usuarios;
	}

	// Todos os critérios do estudo, com a resposta registrada (ou vazia, se ainda não avaliado)
	@Transactional(readOnly = true)
	public AvaliacaoResponse consultar(Long candidatoId) {
		Candidato candidato = buscarCandidato(candidatoId);
		return montarResposta(candidato, criteriosDoEstudo(candidato), avaliacoes.findByCandidatoId(candidatoId));
	}

	// Registra (ou refaz) a avaliação e atualiza o status do candidato para ELEGIVEL ou INELEGIVEL
	@Transactional
	public AvaliacaoResponse avaliar(Long candidatoId, AvaliacaoRequest dados, Long avaliadorId) {
		Candidato candidato = buscarCandidato(candidatoId);
		if (candidato.getEstudo().getEstado() != EstadoEstudo.RECRUTAMENTO) {
			throw new RegraNegocioException("ESTUDO_FORA_DE_RECRUTAMENTO",
					"Só é possível avaliar candidatos com o estudo em recrutamento", HttpStatus.CONFLICT);
		}
		if (candidato.getStatus() == StatusCandidato.INCLUIDO || candidato.getStatus() == StatusCandidato.RETIRADO) {
			throw new RegraNegocioException("CANDIDATO_JA_INCLUIDO",
					"Candidato incluído ou retirado não pode ser reavaliado", HttpStatus.CONFLICT);
		}
		// O consentimento vale para a avaliação em que o candidato foi considerado elegível (MER-v2, seção 4)
		if (candidato.isConsentimentoRegistrado()) {
			throw new RegraNegocioException("CANDIDATO_COM_CONSENTIMENTO",
					"Candidato com consentimento registrado não pode ser reavaliado", HttpStatus.CONFLICT);
		}
		List<Criterio> criteriosDoEstudo = criteriosDoEstudo(candidato);
		if (criteriosDoEstudo.stream().noneMatch(criterio -> criterio.getTipo() == TipoCriterio.INCLUSAO)) {
			throw new RegraNegocioException("ESTUDO_SEM_CRITERIOS_DE_INCLUSAO",
					"Cadastre ao menos um critério de inclusão no estudo antes de avaliar candidatos",
					HttpStatus.CONFLICT);
		}
		validarRespostas(dados.respostas(), criteriosDoEstudo);

		Usuario avaliador = usuarios.findById(avaliadorId)
				.orElseThrow(() -> new RegraNegocioException("NAO_AUTENTICADO", "Sessão inválida. Entre novamente",
						HttpStatus.UNAUTHORIZED));
		Map<Long, Criterio> porId = criteriosDoEstudo.stream()
				.collect(Collectors.toMap(Criterio::getId, Function.identity()));
		List<AvaliacaoCriterio> novas = dados.respostas().stream()
				.map(resposta -> new AvaliacaoCriterio(candidato, porId.get(resposta.criterioId()), resposta.atende(),
						normalizarObservacao(resposta.observacao())))
				.toList();

		boolean elegivel = RegraElegibilidade.elegivel(novas.stream()
				.map(avaliacao -> new RegraElegibilidade.Resposta(avaliacao.getCriterio().getTipo(), avaliacao.isAtende()))
				.toList());

		avaliacoes.apagarDoCandidato(candidatoId);
		avaliacoes.saveAll(novas);
		candidato.registrarAvaliacao(elegivel, avaliador);
		return montarResposta(candidato, criteriosDoEstudo, novas);
	}

	// Exige exatamente uma resposta para cada critério do estudo
	private static void validarRespostas(List<AvaliacaoRequest.Resposta> respostas, List<Criterio> criteriosDoEstudo) {
		Set<Long> idsDoEstudo = criteriosDoEstudo.stream().map(Criterio::getId).collect(Collectors.toSet());
		Set<Long> respondidos = new HashSet<>();
		for (AvaliacaoRequest.Resposta resposta : respostas) {
			if (!idsDoEstudo.contains(resposta.criterioId())) {
				throw new ValidacaoException("respostas",
						"O critério " + resposta.criterioId() + " não pertence a este estudo");
			}
			if (!respondidos.add(resposta.criterioId())) {
				throw new ValidacaoException("respostas",
						"O critério " + resposta.criterioId() + " foi avaliado mais de uma vez");
			}
		}
		List<String> faltando = criteriosDoEstudo.stream()
				.filter(criterio -> !respondidos.contains(criterio.getId()))
				.map(Criterio::getDescricao)
				.toList();
		if (!faltando.isEmpty()) {
			throw new ValidacaoException("respostas",
					"Todos os critérios do estudo devem ser avaliados. Falta: " + String.join("; ", faltando));
		}
	}

	private Candidato buscarCandidato(Long candidatoId) {
		return candidatos.findById(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
	}

	private List<Criterio> criteriosDoEstudo(Candidato candidato) {
		return criterios.findByEstudoId(candidato.getEstudo().getId()).stream()
				.sorted(ORDEM_DOS_CRITERIOS)
				.toList();
	}

	private static AvaliacaoResponse montarResposta(Candidato candidato, List<Criterio> criteriosDoEstudo,
			List<AvaliacaoCriterio> respostas) {
		Map<Long, AvaliacaoCriterio> respostaPorCriterio = respostas.stream()
				.collect(Collectors.toMap(resposta -> resposta.getCriterio().getId(), Function.identity()));
		List<AvaliacaoResponse.Item> itens = criteriosDoEstudo.stream()
				.map(criterio -> {
					AvaliacaoCriterio resposta = respostaPorCriterio.get(criterio.getId());
					return new AvaliacaoResponse.Item(criterio.getId(), criterio.getTipo(), criterio.getDescricao(),
							criterio.getOrdem(), resposta == null ? null : resposta.isAtende(),
							resposta == null ? null : resposta.getObservacao());
				})
				.toList();
		Usuario avaliador = candidato.getAvaliadoPor();
		return new AvaliacaoResponse(candidato.getId(), candidato.getStatus(), candidato.getAvaliadoEm(),
				avaliador == null ? null : new AvaliacaoResponse.Avaliador(avaliador.getId(), avaliador.getNome()),
				itens);
	}

	private static String normalizarObservacao(String observacao) {
		return observacao == null || observacao.isBlank() ? null : observacao.trim();
	}

}
