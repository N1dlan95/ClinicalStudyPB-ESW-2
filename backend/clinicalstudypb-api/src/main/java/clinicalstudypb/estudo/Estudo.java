package clinicalstudypb.estudo;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.usuario.Usuario;
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

@Entity
@Table(name = "estudo")
public class Estudo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 200)
	private String titulo;

	@Column(nullable = false, length = 2000)
	private String objetivo;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "responsavel_id", nullable = false)
	private Usuario responsavel;

	@Column(name = "data_inicio", nullable = false)
	private LocalDate dataInicio;

	@Column(name = "data_fim")
	private LocalDate dataFim;

	@Column(name = "limite_participantes", nullable = false)
	private int limiteParticipantes;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EstadoEstudo estado = EstadoEstudo.PLANEJAMENTO;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected Estudo() {
		// exigido pelo JPA
	}

	public Estudo(String titulo, String objetivo, Usuario responsavel, LocalDate dataInicio, LocalDate dataFim,
			int limiteParticipantes) {
		atualizarDados(titulo, objetivo, responsavel, dataInicio, dataFim, limiteParticipantes);
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

	// Não altera o estado: a mudança de estado tem regras próprias (RF07)
	public void atualizarDados(String titulo, String objetivo, Usuario responsavel, LocalDate dataInicio,
			LocalDate dataFim, int limiteParticipantes) {
		this.titulo = titulo;
		this.objetivo = objetivo;
		this.responsavel = responsavel;
		this.dataInicio = dataInicio;
		this.dataFim = dataFim;
		this.limiteParticipantes = limiteParticipantes;
	}

	public boolean isEncerrado() {
		return estado == EstadoEstudo.ENCERRADO;
	}

	public Long getId() {
		return id;
	}

	public String getTitulo() {
		return titulo;
	}

	public String getObjetivo() {
		return objetivo;
	}

	public Usuario getResponsavel() {
		return responsavel;
	}

	public LocalDate getDataInicio() {
		return dataInicio;
	}

	public LocalDate getDataFim() {
		return dataFim;
	}

	public int getLimiteParticipantes() {
		return limiteParticipantes;
	}

	public EstadoEstudo getEstado() {
		return estado;
	}

	public LocalDateTime getCriadoEm() {
		return criadoEm;
	}

	public LocalDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
