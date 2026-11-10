package clinicalstudypb.avaliacao;

import java.util.Collection;

import clinicalstudypb.criterio.TipoCriterio;

// RF09: o candidato é elegível se atende TODOS os critérios de inclusão e NENHUM de exclusão
public final class RegraElegibilidade {

	public record Resposta(TipoCriterio tipo, boolean atende) {
	}

	private RegraElegibilidade() {
	}

	public static boolean elegivel(Collection<Resposta> respostas) {
		boolean atendeTodasAsInclusoes = respostas.stream()
				.filter(resposta -> resposta.tipo() == TipoCriterio.INCLUSAO)
				.allMatch(Resposta::atende);
		boolean temAlgumaExclusao = respostas.stream()
				.filter(resposta -> resposta.tipo() == TipoCriterio.EXCLUSAO)
				.anyMatch(Resposta::atende);
		return atendeTodasAsInclusoes && !temAlgumaExclusao;
	}

}
