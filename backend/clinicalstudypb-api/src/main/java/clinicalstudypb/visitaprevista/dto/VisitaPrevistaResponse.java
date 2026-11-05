package clinicalstudypb.visitaprevista.dto;

import java.util.List;

import clinicalstudypb.visitaprevista.Atividade;
import clinicalstudypb.visitaprevista.VisitaPrevista;

public record VisitaPrevistaResponse(Long id, int ordem, String nome, int diaPrevisto, Integer janelaDias,
		String descricao, List<AtividadeResponse> atividades) {

	public static VisitaPrevistaResponse de(VisitaPrevista visita) {
		List<AtividadeResponse> atividades = visita.getAtividades().stream()
				.sorted(java.util.Comparator.comparingInt(Atividade::getOrdem))
				.map(AtividadeResponse::de)
				.toList();
		return new VisitaPrevistaResponse(visita.getId(), visita.getOrdem(), visita.getNome(),
				visita.getDiaPrevisto(), visita.getJanelaDias(), visita.getDescricao(), atividades);
	}
}
