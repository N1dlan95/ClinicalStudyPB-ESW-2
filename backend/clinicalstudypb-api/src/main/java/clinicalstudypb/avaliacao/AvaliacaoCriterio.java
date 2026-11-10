package clinicalstudypb.avaliacao;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.criterio.Criterio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// RF09: resposta da avaliação de um candidato para um critério do estudo
@Entity
@Table(name = "avaliacao_criterio")
public class AvaliacaoCriterio {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "candidato_id", nullable = false, updatable = false)
	private Candidato candidato;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "criterio_id", nullable = false, updatable = false)
	private Criterio criterio;

	// Para critério de exclusão, true significa que o candidato TEM a condição que o exclui
	@Column(nullable = false)
	private boolean atende;

	@Column(length = 500)
	private String observacao;

	protected AvaliacaoCriterio() {
		// exigido pelo JPA
	}

	public AvaliacaoCriterio(Candidato candidato, Criterio criterio, boolean atende, String observacao) {
		this.candidato = candidato;
		this.criterio = criterio;
		this.atende = atende;
		this.observacao = observacao;
	}

	public Long getId() {
		return id;
	}

	public Candidato getCandidato() {
		return candidato;
	}

	public Criterio getCriterio() {
		return criterio;
	}

	public boolean isAtende() {
		return atende;
	}

	public String getObservacao() {
		return observacao;
	}

}
