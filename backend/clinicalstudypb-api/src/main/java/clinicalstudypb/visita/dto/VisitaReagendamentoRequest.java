package clinicalstudypb.visita.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// RF12: nova data, hora e local de uma visita ainda agendada
public record VisitaReagendamentoRequest(
		@NotNull(message = "A data e a hora são obrigatórias")
		LocalDateTime dataHora,

		@Size(max = 120, message = "O local deve ter no máximo 120 caracteres")
		String local) {
}
