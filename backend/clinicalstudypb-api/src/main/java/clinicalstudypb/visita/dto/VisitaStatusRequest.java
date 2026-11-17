package clinicalstudypb.visita.dto;

import clinicalstudypb.visita.StatusVisita;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// RF13: realizada, ausente ou cancelada. No cancelamento, a observação (motivo) é obrigatória.
public record VisitaStatusRequest(
		@NotNull(message = "O status é obrigatório")
		StatusVisita status,

		@Size(max = 500, message = "A observação deve ter no máximo 500 caracteres")
		String observacao) {
}
