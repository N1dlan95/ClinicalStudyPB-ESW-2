package clinicalstudypb.criterio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CriterioRepository extends JpaRepository<Criterio, Long> {

	List<Criterio> findByEstudoId(Long estudoId);

	// Garante que o critério pertence ao estudo da URL
	Optional<Criterio> findByIdAndEstudoId(Long id, Long estudoId);

	boolean existsByEstudoIdAndTipoAndOrdem(Long estudoId, TipoCriterio tipo, int ordem);

	boolean existsByEstudoIdAndTipoAndOrdemAndIdNot(Long estudoId, TipoCriterio tipo, int ordem, Long id);

	// Maior ordem já usada naquele tipo no estudo (0 quando ainda não há critério)
	@Query("select coalesce(max(c.ordem), 0) from Criterio c where c.estudo.id = :estudoId and c.tipo = :tipo")
	int maiorOrdem(@Param("estudoId") Long estudoId, @Param("tipo") TipoCriterio tipo);

}
