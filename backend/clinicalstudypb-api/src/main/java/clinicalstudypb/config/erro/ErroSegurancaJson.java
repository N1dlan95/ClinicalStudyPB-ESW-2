package clinicalstudypb.config.erro;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import jakarta.servlet.http.HttpServletResponse;

// Escreve o erro no formato da API direto na resposta. Usado pelos erros do filtro de segurança (401 e 403),
// que acontecem antes dos controllers e por isso não passam pelo TratadorDeErros.
final class ErroSegurancaJson {

	private ErroSegurancaJson() {
	}

	// As mensagens são fixas no código e não têm aspas, por isso não precisam de escape
	static void escrever(HttpServletResponse response, HttpStatus status, String codigo, String mensagem)
			throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write("""
				{"timestamp":"%s","status":%d,"codigo":"%s","mensagem":"%s","detalhes":[]}"""
				.formatted(OffsetDateTime.now(), status.value(), codigo, mensagem));
	}

}
