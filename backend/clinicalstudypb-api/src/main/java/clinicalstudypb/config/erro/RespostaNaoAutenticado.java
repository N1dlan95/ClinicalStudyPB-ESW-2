package clinicalstudypb.config.erro;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// 401 quando o token está ausente, é inválido, expirou ou foi encerrado no logout
@Component
public class RespostaNaoAutenticado implements AuthenticationEntryPoint {

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException excecao) throws IOException {
		response.setHeader("WWW-Authenticate", "Bearer");
		ErroSegurancaJson.escrever(response, HttpStatus.UNAUTHORIZED, "NAO_AUTENTICADO",
				"Token ausente, inválido ou expirado. Entre novamente");
	}

}
