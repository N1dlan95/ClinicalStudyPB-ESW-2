package clinicalstudypb.avaliacao.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// RF09: uma resposta para cada critério do estudo
public record AvaliacaoRequest(
		@NotEmpty(message = "Informe a avaliação dos critérios")
		List<@Valid @NotNull(message = "Resposta vazia") Resposta> respostas) {

	public record Resposta(
			@NotNull(message = "O critério é obrigatório")
			Long criterioId,

			@NotNull(message = "Informe se o candidato atende o critério")
			Boolean atende,

			@Size(max = 500, message = "A observação deve ter no máximo 500 caracteres")
			String observacao) {
	}

}
