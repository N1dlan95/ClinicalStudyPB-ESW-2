package clinicalstudypb.config.erro;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// 401 no formato de erro da API quando o token está ausente, é inválido, expirou ou foi encerrado no logout.
// Roda no filtro de segurança, antes dos controllers, por isso não passa pelo TratadorDeErros.
@Component
public class RespostaNaoAutenticado implements AuthenticationEntryPoint {

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException excecao) throws IOException {
		response.setStatus(HttpStatus.UNAUTHORIZED.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setHeader("WWW-Authenticate", "Bearer");
		response.getWriter().write("""
				{"timestamp":"%s","status":401,"codigo":"NAO_AUTENTICADO",\
				"mensagem":"Token ausente, inválido ou expirado. Entre novamente","detalhes":[]}"""
				.formatted(OffsetDateTime.now()));
	}

}
