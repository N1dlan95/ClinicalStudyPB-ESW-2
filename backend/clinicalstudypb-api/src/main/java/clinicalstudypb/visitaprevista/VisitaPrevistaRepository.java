package clinicalstudypb.visitaprevista;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaPrevistaRepository extends JpaRepository<VisitaPrevista, Long> {

	java.util.List<VisitaPrevista> findByEstudoIdOrderByOrdemAsc(Long estudoId);

	Optional<VisitaPrevista> findByIdAndEstudoId(Long id, Long estudoId);

	boolean existsByEstudoIdAndOrdem(Long estudoId, int ordem);

	boolean existsByEstudoIdAndOrdemAndIdNot(Long estudoId, int ordem, Long id);
}
