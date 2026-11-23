package clinicalstudypb.conta.dto;

// Conta de acesso do participante ao app (perfil PARTICIPANTE).
// senhaProvisoria só vem preenchida quando a senha acabou de ser gerada (conta nova ou senha redefinida):
// ela não fica guardada em texto e não aparece de novo. contaExistente indica que a pessoa já tinha conta
// de participante (por exemplo, incluída antes em outro estudo) e continua com a senha que já usava.
public record ContaParticipanteResponse(
		Long usuarioId,
		String email,
		boolean ativo,
		boolean contaExistente,
		String senhaProvisoria) {
}
