package clinicalstudypb.candidato;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface CandidatoRepository extends JpaRepository<Candidato, Long> {

	Page<Candidato> findByEstudoId(Long estudoId, Pageable paginacao);

	Page<Candidato> findByEstudoIdAndStatus(Long estudoId, StatusCandidato status, Pageable paginacao);

	Optional<Candidato> findByIdAndEstudoId(Long id, Long estudoId);

	boolean existsByEstudoIdAndEmailIgnoreCase(Long estudoId, String email);

	boolean existsByEstudoIdAndEmailIgnoreCaseAndIdNot(Long estudoId, String email, Long id);

	long countByEstudoIdAndStatus(Long estudoId, StatusCandidato status);

	// Trava o candidato até o fim da transação: duas inclusões dele ao mesmo tempo não passam juntas
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from Candidato c where c.id = :id")
	Optional<Candidato> buscarParaAtualizar(@Param("id") Long id);

}
