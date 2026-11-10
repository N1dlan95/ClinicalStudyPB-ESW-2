package clinicalstudypb.avaliacao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AvaliacaoCriterioRepository extends JpaRepository<AvaliacaoCriterio, Long> {

	List<AvaliacaoCriterio> findByCandidatoId(Long candidatoId);

	// Apaga direto no banco, antes de gravar as respostas novas: o Hibernate faria os inserts
	// antes dos deletes e esbarraria na chave única (candidato, critério)
	@Modifying(flushAutomatically = true, clearAutomatically = false)
	@Query("delete from AvaliacaoCriterio a where a.candidato.id = :candidatoId")
	void apagarDoCandidato(Long candidatoId);

}
