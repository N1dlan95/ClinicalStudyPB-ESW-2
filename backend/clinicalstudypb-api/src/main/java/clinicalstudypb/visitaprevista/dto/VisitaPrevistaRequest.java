package clinicalstudypb.visitaprevista.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VisitaPrevistaRequest(
		@NotNull(message = "A ordem é obrigatória")
		@Min(value = 1, message = "A ordem deve ser maior que zero")
		Integer ordem,

		@NotBlank(message = "O nome é obrigatório")
		@Size(min = 3, max = 120, message = "O nome deve ter entre 3 e 120 caracteres")
		String nome,

		@NotNull(message = "O dia previsto é obrigatório")
		@Min(value = 0, message = "O dia previsto não pode ser negativo")
		Integer diaPrevisto,

		@Min(value = 0, message = "A janela de dias não pode ser negativa")
		Integer janelaDias,

		@Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres")
		String descricao,

		List<@Valid AtividadeRequest> atividades) {
}
