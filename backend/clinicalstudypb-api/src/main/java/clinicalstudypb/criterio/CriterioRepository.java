package clinicalstudypb.criterio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CriterioRepository extends JpaRepository<Criterio, Long> {

	List<Criterio> findByEstudoId(Long estudoId);

}
