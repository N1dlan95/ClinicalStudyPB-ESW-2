package clinicalstudypb.visitaprevista;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "atividade", uniqueConstraints = {
		@UniqueConstraint(name = "uk_atividade_visita_ordem", columnNames = { "visita_prevista_id", "ordem" })
})
public class Atividade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "visita_prevista_id", nullable = false, updatable = false)
	private VisitaPrevista visitaPrevista;

	@Column(nullable = false)
	private int ordem;

	@Column(nullable = false, length = 500)
	private String descricao;

	protected Atividade() {
		// exigido pelo JPA
	}

	public Atividade(int ordem, String descricao) {
		this.ordem = ordem;
		this.descricao = descricao;
	}

	void definirVisita(VisitaPrevista visitaPrevista) {
		this.visitaPrevista = visitaPrevista;
	}

	public Long getId() {
		return id;
	}

	public VisitaPrevista getVisitaPrevista() {
		return visitaPrevista;
	}

	public int getOrdem() {
		return ordem;
	}

	public String getDescricao() {
		return descricao;
	}
}
