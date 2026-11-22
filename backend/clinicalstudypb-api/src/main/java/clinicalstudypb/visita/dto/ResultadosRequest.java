package clinicalstudypb.visita.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// RF14: resultados de uma ou mais atividades da visita, gravados de uma vez
public record ResultadosRequest(
		@NotEmpty(message = "Informe ao menos um resultado")
		List<@Valid Item> itens) {

	public record Item(
			@NotNull(message = "A atividade é obrigatória")
			Long atividadeId,

			@NotBlank(message = "O resultado é obrigatório")
			@Size(max = 500, message = "O resultado deve ter no máximo 500 caracteres")
			String resultado,

			@Size(max = 500, message = "A observação deve ter no máximo 500 caracteres")
			String observacao) {
	}

}
