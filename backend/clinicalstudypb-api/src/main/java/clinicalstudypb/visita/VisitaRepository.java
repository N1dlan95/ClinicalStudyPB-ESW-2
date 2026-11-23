package clinicalstudypb.visita;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

// As consultas de leitura já trazem o participante, a visita prevista e quem agendou/registrou, usados na resposta
public interface VisitaRepository extends JpaRepository<Visita, Long> {

	@EntityGraph(attributePaths = { "participante", "visitaPrevista", "agendadaPor", "statusRegistradoPor" })
	List<Visita> findByParticipanteIdOrderByDataHoraAsc(Long candidatoId);

	@EntityGraph(attributePaths = { "participante", "visitaPrevista", "agendadaPor", "statusRegistradoPor" })
	@Query("""
			select v from Visita v
			where v.participante.estudo.id = :estudoId
			  and (:status is null or v.status = :status)
			  and (cast(:de as timestamp) is null or v.dataHora >= :de)
			  and (cast(:ate as timestamp) is null or v.dataHora < :ate)
			order by v.dataHora asc, v.id asc
			""")
	List<Visita> buscarDoEstudo(@Param("estudoId") Long estudoId, @Param("status") StatusVisita status,
			@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

	@EntityGraph(attributePaths = { "participante", "visitaPrevista", "agendadaPor", "statusRegistradoPor" })
	@Query("select v from Visita v where v.id = :id")
	Optional<Visita> buscar(@Param("id") Long id);

	// RF15 (task 3765): todas as visitas do participante, em qualquer status, da mais antiga para a mais recente
	@EntityGraph(attributePaths = "visitaPrevista")
	@Query("select v from Visita v where v.participante.id = :candidatoId order by v.dataHora asc, v.id asc")
	List<Visita> buscarDoHistorico(@Param("candidatoId") Long candidatoId);

	// Trava a visita até o fim da transação: dois registros de status ao mesmo tempo não passam juntos
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select v from Visita v where v.id = :id")
	Optional<Visita> buscarParaAtualizar(@Param("id") Long id);

	boolean existsByParticipanteIdAndVisitaPrevistaIdAndStatusNot(Long candidatoId, Long visitaPrevistaId,
			StatusVisita status);

	boolean existsByVisitaPrevistaId(Long visitaPrevistaId);

	// Task 3768: na retirada, as visitas ainda AGENDADA do participante são canceladas
	List<Visita> findByParticipanteIdAndStatus(Long candidatoId, StatusVisita status);

	// RF17 (task 3773): próxima visita agendada de uma participação, a partir de agora
	@EntityGraph(attributePaths = "visitaPrevista")
	Optional<Visita> findFirstByParticipanteIdAndStatusAndDataHoraGreaterThanEqualOrderByDataHoraAsc(Long candidatoId,
			StatusVisita status, LocalDateTime aPartirDe);

	// RF18 (task 3775): visitas de todas as participações de uma conta, por data e hora
	@EntityGraph(attributePaths = { "participante", "participante.estudo", "visitaPrevista" })
	@Query("""
			select v from Visita v
			where v.participante.usuario.id = :usuarioId
			  and v.status in :status
			order by v.dataHora asc, v.id asc
			""")
	List<Visita> buscarDaConta(@Param("usuarioId") Long usuarioId, @Param("status") Collection<StatusVisita> status);

}
