package clinicalstudypb.avaliacao.dto;

import java.time.LocalDateTime;
import java.util.List;

import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.criterio.TipoCriterio;

// Avaliação do candidato com todos os critérios do estudo. Antes da primeira avaliação,
// avaliadoEm e avaliadoPor vêm nulos e cada critério vem com "atende" nulo.
public record AvaliacaoResponse(
		Long candidatoId,
		StatusCandidato status,
		LocalDateTime avaliadoEm,
		Avaliador avaliadoPor,
		List<Item> criterios) {

	public record Avaliador(Long id, String nome) {
	}

	public record Item(Long criterioId, TipoCriterio tipo, String descricao, int ordem, Boolean atende,
			String observacao) {
	}

}
