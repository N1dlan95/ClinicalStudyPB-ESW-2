package clinicalstudypb.visita;

import java.time.LocalDateTime;

import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visitaprevista.Atividade;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// RF14 (task 3763): resultado fictício de uma atividade da visita prevista, registrado em uma visita realizada
@Entity
@Table(name = "resultado_atividade")
public class ResultadoAtividade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "visita_id", nullable = false, updatable = false)
	private Visita visita;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "atividade_id", nullable = false, updatable = false)
	private Atividade atividade;

	@Column(nullable = false, length = 500)
	private String resultado;

	@Column(length = 500)
	private String observacao;

	// Quem registrou ou alterou por último, e quando
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "registrado_por_id", nullable = false)
	private Usuario registradoPor;

	@Column(name = "registrado_em", nullable = false)
	private LocalDateTime registradoEm;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected ResultadoAtividade() {
		// exigido pelo JPA
	}

	public ResultadoAtividade(Visita visita, Atividade atividade, String resultado, String observacao,
			Usuario responsavel) {
		this.visita = visita;
		this.atividade = atividade;
		registrar(resultado, observacao, responsavel);
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

	// As validações (visita realizada, atividade da visita) ficam no ResultadoService
	public void registrar(String resultado, String observacao, Usuario responsavel) {
		this.resultado = resultado;
		this.observacao = observacao;
		this.registradoPor = responsavel;
		this.registradoEm = LocalDateTime.now();
	}

	public Long getId() {
		return id;
	}

	public Visita getVisita() {
		return visita;
	}

	public Atividade getAtividade() {
		return atividade;
	}

	public String getResultado() {
		return resultado;
	}

	public String getObservacao() {
		return observacao;
	}

	public Usuario getRegistradoPor() {
		return registradoPor;
	}

	public LocalDateTime getRegistradoEm() {
		return registradoEm;
	}

}
