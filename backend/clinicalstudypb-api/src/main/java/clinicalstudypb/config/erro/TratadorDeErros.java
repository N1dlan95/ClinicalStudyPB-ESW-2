package clinicalstudypb.config.erro;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

// Converte as exceções no formato de erro do contrato da API
@RestControllerAdvice
public class TratadorDeErros {

	// Campos do corpo da requisição inválidos (@Valid)
	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErroResponse> validacao(MethodArgumentNotValidException ex) {
		List<ErroResponse.Detalhe> detalhes = ex.getBindingResult().getFieldErrors().stream()
				.map(erro -> new ErroResponse.Detalhe(erro.getField(), erro.getDefaultMessage()))
				.toList();
		return resposta(HttpStatus.BAD_REQUEST, ErroResponse.de(400, "VALIDACAO", "Dados inválidos", detalhes));
	}

	// Parâmetros de URL inválidos (ex.: size acima de 100)
	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ErroResponse> validacaoParametros(HandlerMethodValidationException ex) {
		List<ErroResponse.Detalhe> detalhes = ex.getParameterValidationResults().stream()
				.flatMap(resultado -> resultado.getResolvableErrors().stream()
						.map(erro -> new ErroResponse.Detalhe(
								resultado.getMethodParameter().getParameterName(),
								erro.getDefaultMessage())))
				.toList();
		return resposta(HttpStatus.BAD_REQUEST, ErroResponse.de(400, "VALIDACAO", "Dados inválidos", detalhes));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErroResponse> corpoInvalido(HttpMessageNotReadableException ex) {
		return resposta(HttpStatus.BAD_REQUEST,
				ErroResponse.de(400, "VALIDACAO", "Corpo da requisição ausente ou com formato inválido"));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ErroResponse> parametroInvalido(MethodArgumentTypeMismatchException ex) {
		return resposta(HttpStatus.BAD_REQUEST,
				ErroResponse.de(400, "VALIDACAO", "Valor inválido para o parâmetro " + ex.getName()));
	}

	@ExceptionHandler(RecursoNaoEncontradoException.class)
	ResponseEntity<ErroResponse> naoEncontrado(RecursoNaoEncontradoException ex) {
		return resposta(HttpStatus.NOT_FOUND, ErroResponse.de(404, "NAO_ENCONTRADO", ex.getMessage()));
	}

	@ExceptionHandler(RegraNegocioException.class)
	ResponseEntity<ErroResponse> regraNegocio(RegraNegocioException ex) {
		return resposta(ex.getStatus(), ErroResponse.de(ex.getStatus().value(), ex.getCodigo(), ex.getMessage()));
	}

	private ResponseEntity<ErroResponse> resposta(HttpStatus status, ErroResponse corpo) {
		return ResponseEntity.status(status).body(corpo);
	}

}
