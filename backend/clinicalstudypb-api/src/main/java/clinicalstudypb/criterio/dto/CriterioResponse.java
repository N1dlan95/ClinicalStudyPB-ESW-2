package clinicalstudypb.criterio.dto;

import clinicalstudypb.criterio.Criterio;
import clinicalstudypb.criterio.TipoCriterio;

public record CriterioResponse(
		Long id,
		TipoCriterio tipo,
		String descricao,
		int ordem) {

	public static CriterioResponse de(Criterio criterio) {
		return new CriterioResponse(criterio.getId(), criterio.getTipo(), criterio.getDescricao(),
				criterio.getOrdem());
	}

}
