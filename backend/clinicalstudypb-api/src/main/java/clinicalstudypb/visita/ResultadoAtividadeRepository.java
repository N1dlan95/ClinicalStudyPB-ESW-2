package clinicalstudypb.visita;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResultadoAtividadeRepository extends JpaRepository<ResultadoAtividade, Long> {

	// Já traz a atividade e quem registrou, usados na resposta
	@EntityGraph(attributePaths = { "atividade", "registradoPor" })
	List<ResultadoAtividade> findByVisitaId(Long visitaId);

	// Visita prevista com resultados não pode ter as atividades trocadas (VisitaPrevistaService)
	boolean existsByAtividadeVisitaPrevistaId(Long visitaPrevistaId);

}
