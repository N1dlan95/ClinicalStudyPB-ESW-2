package clinicalstudypb.conta;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

// Task 3751: a senha provisória precisa passar na regra de senha do RF01 (8 a 72 caracteres) e ser fácil de ditar
class GeradorSenhaProvisoriaTest {

	private final GeradorSenhaProvisoria gerador = new GeradorSenhaProvisoria();

	@RepeatedTest(50)
	void temDezCaracteresComMaiusculaMinusculaENumero() {
		String senha = gerador.gerar();

		assertThat(senha).hasSize(GeradorSenhaProvisoria.TAMANHO);
		assertThat(senha).matches(".*[A-Z].*").matches(".*[a-z].*").matches(".*[0-9].*");
	}

	@RepeatedTest(50)
	void naoUsaCaracteresQueSeConfundem() {
		assertThat(gerador.gerar()).doesNotContain("0", "O", "1", "l", "I");
	}

	@Test
	void senhasSeguidasSaoDiferentes() {
		Set<String> senhas = new HashSet<>();
		for (int i = 0; i < 200; i++) {
			senhas.add(gerador.gerar());
		}
		assertThat(senhas).hasSize(200);
	}

}
