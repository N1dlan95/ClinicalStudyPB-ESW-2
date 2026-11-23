package clinicalstudypb.conta;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import clinicalstudypb.conta.dto.ContaParticipanteResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Task 3751: consulta da conta do participante e nova senha provisória. Somente coordenador
// (regra de /candidatos/** no SecurityConfig). A conta é criada pela inclusão (POST /candidatos/{id}/inclusao).
@RestController
@Tag(name = "Conta do participante", description = "Acesso do participante incluído ao app")
public class ContaParticipanteController {

	private final ContaParticipanteService servico;

	public ContaParticipanteController(ContaParticipanteService servico) {
		this.servico = servico;
	}

	@GetMapping("/candidatos/{candidatoId}/conta")
	@Operation(summary = "Consulta a conta do participante",
			description = "Mostra o e-mail de acesso e se a conta está ativa. A senha nunca é devolvida aqui.")
	public ContaParticipanteResponse consultar(@PathVariable Long candidatoId) {
		return servico.consultar(candidatoId);
	}

	@PostMapping("/candidatos/{candidatoId}/conta/senha-provisoria")
	@Operation(summary = "Gera uma nova senha provisória",
			description = "Substitui a senha do participante e devolve a nova uma única vez.")
	public ContaParticipanteResponse redefinirSenha(@PathVariable Long candidatoId) {
		return servico.redefinirSenha(candidatoId);
	}

}
