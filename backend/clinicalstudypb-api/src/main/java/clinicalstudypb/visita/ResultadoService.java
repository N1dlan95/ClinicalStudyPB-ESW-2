package clinicalstudypb.visita;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import clinicalstudypb.visita.dto.ResultadosRequest;
import clinicalstudypb.visita.dto.ResultadosResponse;
import clinicalstudypb.visitaprevista.Atividade;

// Task 3763 (T-94, RF14): resultados fictícios das atividades de uma visita realizada
@Service
public class ResultadoService {

	private final VisitaRepository visitas;
	private final ResultadoAtividadeRepository resultados;
	private final UsuarioRepository usuarios;

	public ResultadoService(VisitaRepository visitas, ResultadoAtividadeRepository resultados,
			UsuarioRepository usuarios) {
		this.visitas = visitas;
		this.resultados = resultados;
		this.usuarios = usuarios;
	}

	// Todas as atividades da visita prevista, com o resultado ou vazio, em qualquer status da visita
	@Transactional(readOnly = true)
	public ResultadosResponse listar(Long visitaId) {
		Visita visita = visitas.buscar(visitaId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita não encontrada"));
		return resposta(visita, porAtividade(resultados.findByVisitaId(visitaId)));
	}

	// Valida nesta ordem: estudo não encerrado, visita realizada, itens sem atividade repetida e cada atividade
	// da visita prevista desta visita. Só grava depois de validar tudo: se um item falha, nada é gravado.
	// Atividade que já tem resultado é substituída (upsert); as que não vierem na lista ficam como estão.
	@Transactional
	public ResultadosResponse registrar(Long visitaId, ResultadosRequest dados, Long responsavelId) {
		Visita visita = visitas.buscarParaAtualizar(visitaId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Visita não encontrada"));
		if (visita.getParticipante().getEstudo().isEncerrado()) {
			throw conflito("ESTUDO_ENCERRADO", "Não é possível alterar resultados de um estudo encerrado");
		}
		if (visita.getStatus() != StatusVisita.REALIZADA) {
			throw conflito("VISITA_NAO_REALIZADA", "Só é possível registrar resultados de uma visita realizada");
		}
		Map<Long, Atividade> atividadesDaVisita = visita.getVisitaPrevista().getAtividades().stream()
				.collect(Collectors.toMap(Atividade::getId, Function.identity()));
		Set<Long> informadas = new HashSet<>();
		for (ResultadosRequest.Item item : dados.itens()) {
			if (!informadas.add(item.atividadeId())) {
				throw new ValidacaoException("itens", "A mesma atividade aparece mais de uma vez");
			}
			if (!atividadesDaVisita.containsKey(item.atividadeId())) {
				throw conflito("ATIVIDADE_FORA_DA_VISITA", "A atividade %d não pertence à visita \"%s\""
						.formatted(item.atividadeId(), visita.getVisitaPrevista().getNome()));
			}
		}

		Usuario responsavel = responsavel(responsavelId);
		Map<Long, ResultadoAtividade> existentes = porAtividade(resultados.findByVisitaId(visitaId));
		for (ResultadosRequest.Item item : dados.itens()) {
			String resultado = item.resultado().trim();
			String observacao = normalizar(item.observacao());
			ResultadoAtividade existente = existentes.get(item.atividadeId());
			if (existente != null) {
				existente.registrar(resultado, observacao, responsavel);
			} else {
				existentes.put(item.atividadeId(), resultados.save(new ResultadoAtividade(visita,
						atividadesDaVisita.get(item.atividadeId()), resultado, observacao, responsavel)));
			}
		}
		return resposta(visita, existentes);
	}

	private static ResultadosResponse resposta(Visita visita, Map<Long, ResultadoAtividade> porAtividade) {
		List<ResultadosResponse.Item> itens = visita.getVisitaPrevista().getAtividades().stream()
				.map(atividade -> item(atividade, porAtividade.get(atividade.getId())))
				.toList();
		return new ResultadosResponse(visita.getId(), visita.getStatus(), itens);
	}

	private static ResultadosResponse.Item item(Atividade atividade, ResultadoAtividade resultado) {
		if (resultado == null) {
			return new ResultadosResponse.Item(atividade.getId(), atividade.getOrdem(), atividade.getDescricao(),
					null, null, null, null);
		}
		return new ResultadosResponse.Item(atividade.getId(), atividade.getOrdem(), atividade.getDescricao(),
				resultado.getResultado(), resultado.getObservacao(), resultado.getRegistradoEm(),
				resultado.getRegistradoPor().getNome());
	}

	private static Map<Long, ResultadoAtividade> porAtividade(List<ResultadoAtividade> lista) {
		Map<Long, ResultadoAtividade> mapa = new HashMap<>();
		lista.forEach(resultado -> mapa.put(resultado.getAtividade().getId(), resultado));
		return mapa;
	}

	private Usuario responsavel(Long responsavelId) {
		return usuarios.findById(responsavelId)
				.orElseThrow(() -> new RegraNegocioException("NAO_AUTENTICADO", "Sessão inválida. Entre novamente",
						HttpStatus.UNAUTHORIZED));
	}

	private static String normalizar(String texto) {
		return texto == null || texto.isBlank() ? null : texto.trim();
	}

	private static RegraNegocioException conflito(String codigo, String mensagem) {
		return new RegraNegocioException(codigo, mensagem, HttpStatus.CONFLICT);
	}

}
