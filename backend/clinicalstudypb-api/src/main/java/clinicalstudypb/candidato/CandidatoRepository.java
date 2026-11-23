package clinicalstudypb.candidato;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

// As consultas de leitura já trazem quem registrou o consentimento e a retirada, porque a resposta da API
// mostra os nomes
public interface CandidatoRepository extends JpaRepository<Candidato, Long> {

	@EntityGraph(attributePaths = { "consentimentoRegistradoPor", "retiradaRegistradaPor" })
	Page<Candidato> findByEstudoId(Long estudoId, Pageable paginacao);

	@EntityGraph(attributePaths = { "consentimentoRegistradoPor", "retiradaRegistradaPor" })
	Page<Candidato> findByEstudoIdAndStatus(Long estudoId, StatusCandidato status, Pageable paginacao);

	@EntityGraph(attributePaths = { "consentimentoRegistradoPor", "retiradaRegistradaPor" })
	Optional<Candidato> findByIdAndEstudoId(Long id, Long estudoId);

	// RF17 (task 3773): participações de uma conta de participante, com o estudo e o responsável para a resposta
	@EntityGraph(attributePaths = { "estudo", "estudo.responsavel" })
	List<Candidato> findByUsuarioIdAndStatusIn(Long usuarioId, Collection<StatusCandidato> status);

	// RF15 (task 3765): o histórico mostra o estudo e quem registrou a retirada
	@EntityGraph(attributePaths = { "estudo", "retiradaRegistradaPor" })
	@Query("select c from Candidato c where c.id = :id")
	Optional<Candidato> buscarParaHistorico(@Param("id") Long id);

	boolean existsByEstudoIdAndEmailIgnoreCase(Long estudoId, String email);

	boolean existsByEstudoIdAndEmailIgnoreCaseAndIdNot(Long estudoId, String email, Long id);

	long countByEstudoIdAndStatus(Long estudoId, StatusCandidato status);

	// Trava o candidato até o fim da transação: duas inclusões dele ao mesmo tempo não passam juntas
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select c from Candidato c where c.id = :id")
	Optional<Candidato> buscarParaAtualizar(@Param("id") Long id);

}
