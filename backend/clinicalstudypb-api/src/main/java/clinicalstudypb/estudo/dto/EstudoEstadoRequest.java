package clinicalstudypb.estudo.dto;

import clinicalstudypb.estudo.EstadoEstudo;
import jakarta.validation.constraints.NotNull;

public record EstudoEstadoRequest(
		@NotNull(message = "O estado é obrigatório")
		EstadoEstudo estado) {
}
