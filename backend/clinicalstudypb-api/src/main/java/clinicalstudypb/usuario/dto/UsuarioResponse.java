package clinicalstudypb.usuario.dto;

import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

public record UsuarioResponse(Long id, String nome, String email, String matricula, Perfil perfil, boolean ativo) {

	public static UsuarioResponse de(Usuario usuario) {
		return new UsuarioResponse(
				usuario.getId(),
				usuario.getNome(),
				usuario.getEmail(),
				usuario.getMatricula(),
				usuario.getPerfil(),
				usuario.isAtivo());
	}

}
