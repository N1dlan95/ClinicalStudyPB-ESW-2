package clinicalstudypb.config;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

// Formato de página do contrato da API (schema Pagina do openapi.yaml)
public record PaginaResponse<T>(List<T> content, int number, int size, long totalElements, int totalPages) {

	public static <E, T> PaginaResponse<T> de(Page<E> pagina, Function<E, T> conversor) {
		return new PaginaResponse<>(
				pagina.getContent().stream().map(conversor).toList(),
				pagina.getNumber(),
				pagina.getSize(),
				pagina.getTotalElements(),
				pagina.getTotalPages());
	}

}
