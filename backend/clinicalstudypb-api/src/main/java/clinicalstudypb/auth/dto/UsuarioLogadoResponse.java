package clinicalstudypb.auth.dto;

import java.util.List;

import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

// Dados do usuário logado e suas permissões (schema UsuarioLogado): a web e o mobile usam para decidir o que exibir
public record UsuarioLogadoResponse(
		Long id,
		String nome,
		String email,
		String matricula,
		Perfil perfil,
		boolean ativo,
		List<String> permissoes) {

	public static UsuarioLogadoResponse de(Usuario usuario) {
		return new UsuarioLogadoResponse(
				usuario.getId(),
				usuario.getNome(),
				usuario.getEmail(),
				usuario.getMatricula(),
				usuario.getPerfil(),
				usuario.isAtivo(),
				usuario.getPerfil().getPermissoes());
	}

}
