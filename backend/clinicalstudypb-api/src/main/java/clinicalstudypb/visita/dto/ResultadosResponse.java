package clinicalstudypb.visita.dto;

import java.time.LocalDateTime;
import java.util.List;

import clinicalstudypb.visita.StatusVisita;

// RF14: todas as atividades da visita prevista, na ordem do protocolo, com o resultado ou vazio
public record ResultadosResponse(Long visitaId, StatusVisita status, List<Item> itens) {

	public record Item(
			Long atividadeId,
			int ordem,
			String descricao,
			String resultado,
			String observacao,
			LocalDateTime registradoEm,
			String registradoPor) {
	}

}
