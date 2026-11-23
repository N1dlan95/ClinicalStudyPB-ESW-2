package clinicalstudypb.historico;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.historico.dto.HistoricoResponse;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visita.ResultadoAtividade;
import clinicalstudypb.visita.ResultadoAtividadeRepository;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visita.VisitaRepository;
import clinicalstudypb.visita.dto.ResultadosResponse;
import clinicalstudypb.visita.dto.VisitaResponse;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// Task 3765 (T-96, RF15): histórico completo do participante, somente leitura.
// São no máximo três consultas, qualquer que seja o número de visitas: o candidato (com o estudo e quem
// registrou a retirada), as visitas (com a visita prevista) e os resultados de todas elas (com a atividade
// e quem registrou).
@Service
public class HistoricoService {

	private final CandidatoRepository candidatos;
	private final VisitaRepository visitas;
	private final ResultadoAtividadeRepository resultados;

	public HistoricoService(CandidatoRepository candidatos, VisitaRepository visitas,
			ResultadoAtividadeRepository resultados) {
		this.candidatos = candidatos;
		this.visitas = visitas;
		this.resultados = resultados;
	}

	// O histórico existe para quem foi incluído: o participante atual (INCLUIDO) e o retirado (RETIRADO,
	// que só é possível depois da inclusão). Os demais status nunca passaram pela inclusão.
	@Transactional(readOnly = true)
	public HistoricoResponse consultar(Long candidatoId) {
		Candidato candidato = candidatos.buscarParaHistorico(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
		if (candidato.getStatus() != StatusCandidato.INCLUIDO && candidato.getStatus() != StatusCandidato.RETIRADO) {
			throw new RegraNegocioException("PARTICIPANTE_NAO_INCLUIDO",
					"Este candidato nunca foi incluído no estudo, por isso não tem histórico", HttpStatus.CONFLICT);
		}
		List<Visita> visitasDoParticipante = visitas.buscarDoHistorico(candidatoId);
		// Sem visitas, não há resultados: a terceira consulta não é feita
		Map<Long, List<ResultadoAtividade>> resultadosPorVisita = visitasDoParticipante.isEmpty() ? Map.of()
				: resultados.findByVisitaParticipanteId(candidatoId).stream()
						.collect(Collectors.groupingBy(resultado -> resultado.getVisita().getId()));
		List<HistoricoResponse.VisitaHistorico> itens = visitasDoParticipante.stream()
				.map(visita -> visitaHistorico(visita, resultadosPorVisita.getOrDefault(visita.getId(), List.of())))
				.toList();
		return new HistoricoResponse(participante(candidato),
				new HistoricoResponse.EstudoResumo(candidato.getEstudo().getId(), candidato.getEstudo().getTitulo()),
				itens);
	}

	private static HistoricoResponse.Participante participante(Candidato candidato) {
		CandidatoResponse.Retirada retirada = null;
		if (candidato.isRetiradaRegistrada()) {
			Usuario responsavel = candidato.getRetiradaRegistradaPor();
			retirada = new CandidatoResponse.Retirada(candidato.getRetiradaRegistradaEm(),
					responsavel == null ? null : responsavel.getNome(), candidato.getMotivoRetirada());
		}
		return new HistoricoResponse.Participante(candidato.getId(), candidato.getNome(), candidato.getEmail(),
				candidato.getStatus(), candidato.getDataInclusao(), retirada);
	}

	private static HistoricoResponse.VisitaHistorico visitaHistorico(Visita visita,
			List<ResultadoAtividade> resultadosDaVisita) {
		VisitaPrevista prevista = visita.getVisitaPrevista();
		List<ResultadosResponse.Item> itens = resultadosDaVisita.stream()
				.sorted(Comparator.comparingInt(resultado -> resultado.getAtividade().getOrdem()))
				.map(HistoricoService::item)
				.toList();
		return new HistoricoResponse.VisitaHistorico(visita.getId(),
				new VisitaResponse.VisitaPrevistaResumo(prevista.getId(), prevista.getOrdem(), prevista.getNome()),
				visita.getDataHora(), visita.getLocal(), visita.getStatus(), visita.getObservacao(), itens);
	}

	private static ResultadosResponse.Item item(ResultadoAtividade resultado) {
		return new ResultadosResponse.Item(resultado.getAtividade().getId(), resultado.getAtividade().getOrdem(),
				resultado.getAtividade().getDescricao(), resultado.getResultado(), resultado.getObservacao(),
				resultado.getRegistradoEm(), resultado.getRegistradoPor().getNome());
	}

}
