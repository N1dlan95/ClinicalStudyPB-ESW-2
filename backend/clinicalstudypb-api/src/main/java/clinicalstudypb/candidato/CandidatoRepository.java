package clinicalstudypb.candidato;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidatoRepository extends JpaRepository<Candidato, Long> {

	Page<Candidato> findByEstudoId(Long estudoId, Pageable paginacao);

	Page<Candidato> findByEstudoIdAndStatus(Long estudoId, StatusCandidato status, Pageable paginacao);

	Optional<Candidato> findByIdAndEstudoId(Long id, Long estudoId);

	boolean existsByEstudoIdAndEmailIgnoreCase(Long estudoId, String email);

	boolean existsByEstudoIdAndEmailIgnoreCaseAndIdNot(Long estudoId, String email, Long id);

}
