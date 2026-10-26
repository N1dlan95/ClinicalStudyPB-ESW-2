package clinicalstudypb.estudo.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Dados para cadastrar ou editar um estudo (schema EstudoEntrada). O estado não vem do cliente.
public record EstudoRequest(
		@NotBlank(message = "O título é obrigatório")
		@Size(min = 3, max = 200, message = "O título deve ter entre 3 e 200 caracteres")
		String titulo,

		@NotBlank(message = "O objetivo é obrigatório")
		@Size(max = 2000, message = "O objetivo deve ter no máximo 2000 caracteres")
		String objetivo,

		@NotNull(message = "O responsável é obrigatório")
		Long responsavelId,

		@NotNull(message = "A data de início é obrigatória")
		LocalDate dataInicio,

		LocalDate dataFim,

		@NotNull(message = "O limite de participantes é obrigatório")
		@Min(value = 1, message = "O limite de participantes deve ser maior que zero")
		Integer limiteParticipantes) {
}
