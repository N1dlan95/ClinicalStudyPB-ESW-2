package clinicalstudypb.participante.dto;

import java.time.LocalDateTime;

import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;

// RF18: uma visita do usuário logado (schema VisitaDoParticipante do openapi.yaml).
// Não traz resultados das avaliações nem observações internas: o RF18 não pede isso no app.
public record VisitaDoParticipanteResponse(
		Long id,
		Long estudoId,
		String estudoTitulo,
		String nome,
		LocalDateTime dataHora,
		String local,
		StatusVisita status) {

	public static VisitaDoParticipanteResponse de(Visita visita) {
		var estudo = visita.getParticipante().getEstudo();
		return new VisitaDoParticipanteResponse(
				visita.getId(),
				estudo.getId(),
				estudo.getTitulo(),
				visita.getVisitaPrevista().getNome(),
				visita.getDataHora(),
				visita.getLocal(),
				visita.getStatus());
	}

}
