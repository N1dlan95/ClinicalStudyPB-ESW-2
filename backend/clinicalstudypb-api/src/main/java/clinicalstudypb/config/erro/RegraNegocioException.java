package clinicalstudypb.config.erro;

import org.springframework.http.HttpStatus;

// Violação de regra de negócio. O código curto (ex.: EMAIL_DUPLICADO) é usado pelo front para tratar o erro.
public class RegraNegocioException extends RuntimeException {

	private final String codigo;
	private final HttpStatus status;

	public RegraNegocioException(String codigo, String mensagem, HttpStatus status) {
		super(mensagem);
		this.codigo = codigo;
		this.status = status;
	}

	public String getCodigo() {
		return codigo;
	}

	public HttpStatus getStatus() {
		return status;
	}

}
