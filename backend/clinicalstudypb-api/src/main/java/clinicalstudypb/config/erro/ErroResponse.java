package clinicalstudypb.config.erro;

import java.time.OffsetDateTime;
import java.util.List;

// Corpo de erro padrão da API (schema Erro do openapi.yaml)
public record ErroResponse(
		OffsetDateTime timestamp,
		int status,
		String codigo,
		String mensagem,
		List<Detalhe> detalhes) {

	public record Detalhe(String campo, String mensagem) {
	}

	public static ErroResponse de(int status, String codigo, String mensagem) {
		return de(status, codigo, mensagem, List.of());
	}

	public static ErroResponse de(int status, String codigo, String mensagem, List<Detalhe> detalhes) {
		return new ErroResponse(OffsetDateTime.now(), status, codigo, mensagem, detalhes);
	}

}
