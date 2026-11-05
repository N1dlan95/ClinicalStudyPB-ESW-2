package clinicalstudypb.criterio.dto;

import clinicalstudypb.criterio.TipoCriterio;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Dados para cadastrar ou editar um critério. Se a ordem não vier, o critério vai para o fim da lista do seu tipo.
public record CriterioRequest(
		@NotNull(message = "O tipo é obrigatório")
		TipoCriterio tipo,

		@NotBlank(message = "A descrição é obrigatória")
		@Size(min = 3, max = 500, message = "A descrição deve ter entre 3 e 500 caracteres")
		String descricao,

		@Min(value = 1, message = "A ordem deve ser maior que zero")
		Integer ordem) {
}
