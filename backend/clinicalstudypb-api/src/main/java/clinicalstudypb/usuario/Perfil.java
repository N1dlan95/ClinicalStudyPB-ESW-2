package clinicalstudypb.usuario;

import java.util.List;

// RF01/RF03: perfis de acesso e as permissões de cada um.
// A lista é fixa no código; a web e o mobile a recebem em GET /perfis e GET /auth/me.
public enum Perfil {

	ADMINISTRADOR(List.of("USUARIO_GERENCIAR", "ESTUDO_CONSULTAR")),
	PESQUISADOR(List.of("ESTUDO_CRIAR", "ESTUDO_EDITAR", "ESTUDO_CONSULTAR")),
	COORDENADOR(List.of("ESTUDO_CONSULTAR")),
	PARTICIPANTE(List.of());

	private final List<String> permissoes;

	Perfil(List<String> permissoes) {
		this.permissoes = permissoes;
	}

	public List<String> getPermissoes() {
		return permissoes;
	}

}
