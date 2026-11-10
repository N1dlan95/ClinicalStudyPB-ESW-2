package clinicalstudypb.visitaprevista.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AtividadeRequest(
		@NotNull(message = "A ordem é obrigatória")
		@Min(value = 1, message = "A ordem deve ser maior que zero")
		Integer ordem,

		@NotBlank(message = "A descrição é obrigatória")
		@Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres")
		String descricao) {
}
