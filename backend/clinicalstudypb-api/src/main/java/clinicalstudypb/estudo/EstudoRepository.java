package clinicalstudypb.estudo;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// As consultas já trazem o responsável junto, porque a resposta da API mostra o nome dele
public interface EstudoRepository extends JpaRepository<Estudo, Long>, JpaSpecificationExecutor<Estudo> {

	@Override
	@EntityGraph(attributePaths = "responsavel")
	Optional<Estudo> findById(Long id);

	@Override
	@EntityGraph(attributePaths = "responsavel")
	Page<Estudo> findAll(Specification<Estudo> filtros, Pageable paginacao);

}
