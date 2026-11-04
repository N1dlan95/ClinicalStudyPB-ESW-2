package clinicalstudypb.estudo;

import org.springframework.data.jpa.domain.Specification;

// Filtros opcionais da listagem de estudos (GET /estudos). Filtro nulo ou vazio não restringe nada.
final class EstudoFiltros {

	private EstudoFiltros() {
	}

	static Specification<Estudo> comFiltros(EstadoEstudo estado, String busca) {
		return Specification.allOf(comEstado(estado), comBusca(busca));
	}

	private static Specification<Estudo> comEstado(EstadoEstudo estado) {
		return (raiz, consulta, cb) -> estado == null ? null : cb.equal(raiz.get("estado"), estado);
	}

	// Procura o texto no título, sem diferenciar maiúsculas
	private static Specification<Estudo> comBusca(String busca) {
		return (raiz, consulta, cb) -> busca == null || busca.isBlank()
				? null
				: cb.like(cb.lower(raiz.get("titulo")), "%" + busca.trim().toLowerCase() + "%");
	}

}
