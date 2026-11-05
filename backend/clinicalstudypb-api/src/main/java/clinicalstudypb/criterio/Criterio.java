package clinicalstudypb.criterio;

import java.time.LocalDateTime;

import clinicalstudypb.estudo.Estudo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// RF05: critério de inclusão ou exclusão de um estudo (MER-v2, seção 3.1).
// Os endpoints de cadastro e as validações de critério ficam na task 3550.
@Entity
@Table(name = "criterio")
public class Criterio {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estudo_id", nullable = false, updatable = false)
	private Estudo estudo;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private TipoCriterio tipo;

	@Column(nullable = false, length = 500)
	private String descricao;

	@Column(nullable = false)
	private int ordem;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected Criterio() {
		// exigido pelo JPA
	}

	public Criterio(Estudo estudo, TipoCriterio tipo, String descricao, int ordem) {
		this.estudo = estudo;
		this.tipo = tipo;
		this.descricao = descricao;
		this.ordem = ordem;
	}

	@PrePersist
	void aoCriar() {
		criadoEm = LocalDateTime.now();
		atualizadoEm = criadoEm;
	}

	@PreUpdate
	void aoAtualizar() {
		atualizadoEm = LocalDateTime.now();
	}
	
	public void atualizar(TipoCriterio tipo, String descricao, int ordem) {
		this.tipo = tipo;
		this.descricao = descricao;
		this.ordem = ordem;
	}
	
		public Long getId() {
		return id;
	}

	public Estudo getEstudo() {
		return estudo;
	}

	public TipoCriterio getTipo() {
		return tipo;
	}

	public String getDescricao() {
		return descricao;
	}

	public int getOrdem() {
		return ordem;
	}

}
