package clinicalstudypb.visita;

import java.time.LocalDate;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// RF06/RF12: a visita prevista guarda o dia relativo à inclusão (D0) e a tolerância em dias.
// Para um participante, a janela vira datas: dataInclusao + diaPrevisto ± janelaDias (sem janela, só o próprio dia).
public record JanelaVisita(LocalDate inicio, LocalDate fim) {

	// Nulo quando o participante ainda não tem data de inclusão
	public static JanelaVisita de(Candidato participante, VisitaPrevista prevista) {
		LocalDate inclusao = participante.getDataInclusao();
		if (inclusao == null) {
			return null;
		}
		LocalDate dia = inclusao.plusDays(prevista.getDiaPrevisto());
		int tolerancia = prevista.getJanelaDias() == null ? 0 : prevista.getJanelaDias();
		return new JanelaVisita(dia.minusDays(tolerancia), dia.plusDays(tolerancia));
	}

	public boolean contem(LocalDate data) {
		return !data.isBefore(inicio) && !data.isAfter(fim);
	}

}
