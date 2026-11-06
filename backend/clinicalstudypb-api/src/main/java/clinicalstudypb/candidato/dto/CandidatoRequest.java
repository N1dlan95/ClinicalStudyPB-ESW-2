package clinicalstudypb.candidato.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Dados para cadastrar ou editar um candidato. O status não vem do cliente.
public record CandidatoRequest(
		@NotBlank(message = "O nome é obrigatório")
		@Size(min = 3, max = 120, message = "O nome deve ter entre 3 e 120 caracteres")
		String nome,

		@NotBlank(message = "O e-mail é obrigatório")
		@Email(message = "E-mail inválido")
		@Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres")
		String email,

		// Opcional; aceita dígitos, espaços, parênteses, + e -
		@Pattern(regexp = "^[0-9 ()+-]{8,20}$", message = "Telefone inválido")
		String telefone,

		@NotNull(message = "A data de nascimento é obrigatória")
		@Past(message = "A data de nascimento deve ser anterior a hoje")
		LocalDate dataNascimento) {
}
