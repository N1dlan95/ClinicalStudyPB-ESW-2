package clinicalstudypb.usuario.dto;

import jakarta.validation.constraints.NotNull;

public record UsuarioStatusRequest(
		@NotNull(message = "Informe se o usuário fica ativo")
		Boolean ativo) {
}
