package clinicalstudypb.usuario;

import org.springframework.data.jpa.domain.Specification;

// Filtros opcionais da listagem de usuários (GET /usuarios). Filtro nulo ou vazio não restringe nada.
final class UsuarioFiltros {

	private UsuarioFiltros() {
	}

	static Specification<Usuario> comFiltros(Perfil perfil, Boolean ativo, String busca) {
		return Specification.allOf(comPerfil(perfil), comAtivo(ativo), comBusca(busca));
	}

	private static Specification<Usuario> comPerfil(Perfil perfil) {
		return (raiz, consulta, cb) -> perfil == null ? null : cb.equal(raiz.get("perfil"), perfil);
	}

	private static Specification<Usuario> comAtivo(Boolean ativo) {
		return (raiz, consulta, cb) -> ativo == null ? null : cb.equal(raiz.get("ativo"), ativo);
	}

	// Procura o texto no nome ou no e-mail, sem diferenciar maiúsculas
	private static Specification<Usuario> comBusca(String busca) {
		return (raiz, consulta, cb) -> {
			if (busca == null || busca.isBlank()) {
				return null;
			}
			String padrao = "%" + busca.trim().toLowerCase() + "%";
			return cb.or(
					cb.like(cb.lower(raiz.get("nome")), padrao),
					cb.like(cb.lower(raiz.get("email")), padrao));
		};
	}

}
