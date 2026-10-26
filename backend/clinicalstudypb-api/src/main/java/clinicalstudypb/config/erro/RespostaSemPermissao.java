package clinicalstudypb.config.erro;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// RF03: 403 quando o usuário está autenticado, mas o perfil dele não permite a ação
@Component
public class RespostaSemPermissao implements AccessDeniedHandler {

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response,
			AccessDeniedException excecao) throws IOException {
		ErroSegurancaJson.escrever(response, HttpStatus.FORBIDDEN, "SEM_PERMISSAO",
				"Seu perfil não tem permissão para esta ação");
	}

}
