package clinicalstudypb.auth.dto;

import java.time.Instant;

public record LoginResponse(String token, String tipo, Instant expiraEm, UsuarioLogadoResponse usuario) {

	public LoginResponse(String token, Instant expiraEm, UsuarioLogadoResponse usuario) {
		this(token, "Bearer", expiraEm, usuario);
	}

}
