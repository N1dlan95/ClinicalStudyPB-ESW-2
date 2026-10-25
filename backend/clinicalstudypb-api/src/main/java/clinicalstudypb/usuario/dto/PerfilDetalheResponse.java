package clinicalstudypb.usuario.dto;

import java.util.List;

import clinicalstudypb.usuario.Perfil;

public record PerfilDetalheResponse(Perfil perfil, List<String> permissoes) {

	public static PerfilDetalheResponse de(Perfil perfil) {
		return new PerfilDetalheResponse(perfil, perfil.getPermissoes());
	}

}
