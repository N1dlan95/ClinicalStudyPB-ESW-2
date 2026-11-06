package clinicalstudypb.visitaprevista;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaPrevistaRepository extends JpaRepository<VisitaPrevista, Long> {

	@EntityGraph(attributePaths = "atividades")
	List<VisitaPrevista> findByEstudoIdOrderByOrdemAsc(Long estudoId);

	@EntityGraph(attributePaths = "atividades")
	Optional<VisitaPrevista> findByIdAndEstudoId(Long id, Long estudoId);

	boolean existsByEstudoIdAndOrdem(Long estudoId, int ordem);

	boolean existsByEstudoIdAndOrdemAndIdNot(Long estudoId, int ordem, Long id);
}
