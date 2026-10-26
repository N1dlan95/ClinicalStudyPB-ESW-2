package clinicalstudypb.config.erro;

// Regra de validação que depende de mais de um campo ou do banco (ex.: data de término antes da de início).
// Responde 400 VALIDACAO apontando o campo, no mesmo formato dos erros do @Valid.
public class ValidacaoException extends RuntimeException {

	private final String campo;

	public ValidacaoException(String campo, String mensagem) {
		super(mensagem);
		this.campo = campo;
	}

	public String getCampo() {
		return campo;
	}

}
