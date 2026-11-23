package clinicalstudypb.conta;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

// RF01/RF11: senha provisória da conta do participante, entregue pelo coordenador na inclusão.
// Sem caracteres que se confundem ao ditar ou ler (0/O, 1/l/I), com letras maiúsculas, minúsculas e números.
@Component
public class GeradorSenhaProvisoria {

	static final int TAMANHO = 10;

	private static final String MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	private static final String MINUSCULAS = "abcdefghijkmnpqrstuvwxyz";
	private static final String NUMEROS = "23456789";
	private static final String TODOS = MAIUSCULAS + MINUSCULAS + NUMEROS;

	private final SecureRandom aleatorio = new SecureRandom();

	public String gerar() {
		char[] senha = new char[TAMANHO];
		// Garante pelo menos um caractere de cada grupo
		senha[0] = sortear(MAIUSCULAS);
		senha[1] = sortear(MINUSCULAS);
		senha[2] = sortear(NUMEROS);
		for (int i = 3; i < TAMANHO; i++) {
			senha[i] = sortear(TODOS);
		}
		// Embaralha para os grupos obrigatórios não ficarem sempre no começo
		for (int i = TAMANHO - 1; i > 0; i--) {
			int j = aleatorio.nextInt(i + 1);
			char troca = senha[i];
			senha[i] = senha[j];
			senha[j] = troca;
		}
		return new String(senha);
	}

	private char sortear(String caracteres) {
		return caracteres.charAt(aleatorio.nextInt(caracteres.length()));
	}

}
