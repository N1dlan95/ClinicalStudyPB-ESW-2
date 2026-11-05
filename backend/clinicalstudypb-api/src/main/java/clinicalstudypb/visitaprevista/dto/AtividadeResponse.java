package clinicalstudypb.visitaprevista.dto;

import clinicalstudypb.visitaprevista.Atividade;

public record AtividadeResponse(Long id, int ordem, String descricao) {

	public static AtividadeResponse de(Atividade atividade) {
		return new AtividadeResponse(atividade.getId(), atividade.getOrdem(), atividade.getDescricao());
	}
}
