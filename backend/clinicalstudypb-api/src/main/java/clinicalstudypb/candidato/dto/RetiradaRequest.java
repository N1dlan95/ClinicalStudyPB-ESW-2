package clinicalstudypb.candidato.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// RF16: motivo da retirada do participante
public record RetiradaRequest(
		@NotBlank(message = "Informe o motivo da retirada")
		@Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres")
		String motivo) {
}
