package clinicalstudypb.usuario.dto;

import clinicalstudypb.usuario.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Não altera senha nem situação (ativo): para isso há rotas próprias
public record UsuarioAtualizacaoRequest(
		@NotBlank(message = "O nome é obrigatório")
		@Size(min = 3, max = 120, message = "O nome deve ter entre 3 e 120 caracteres")
		String nome,

		@NotBlank(message = "O e-mail é obrigatório")
		@Email(message = "E-mail inválido")
		@Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres")
		String email,

		@Size(max = 50, message = "A matrícula deve ter no máximo 50 caracteres")
		String matricula,

		@NotNull(message = "O perfil é obrigatório")
		Perfil perfil) {
}
