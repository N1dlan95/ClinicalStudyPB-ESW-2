package clinicalstudypb.auth;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

// RF02: tokens encerrados no logout. Fica em memória: ao reiniciar o backend a lista se perde,
// mas os tokens continuam limitados pela própria expiração.
@Component
public class TokensRevogados {

	// id do token (jti) -> momento em que ele expiraria
	private final Map<String, Instant> revogados = new ConcurrentHashMap<>();

	public void revogar(String idToken, Instant expiraEm) {
		removerExpirados();
		revogados.put(idToken, expiraEm);
	}

	public boolean estaRevogado(String idToken) {
		return idToken != null && revogados.containsKey(idToken);
	}

	// Token expirado já é recusado pela validação normal; não precisa mais ficar na lista
	private void removerExpirados() {
		Instant agora = Instant.now();
		revogados.values().removeIf(expiraEm -> expiraEm.isBefore(agora));
	}

}
