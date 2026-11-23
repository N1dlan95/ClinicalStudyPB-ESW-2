package clinicalstudypb.visita;

import java.time.LocalDateTime;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visitaprevista.VisitaPrevista;
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

// RF12/RF13: visita de um participante, agendada a partir de uma visita prevista do protocolo
@Entity
@Table(name = "visita")
public class Visita {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// O participante: candidato INCLUIDO no estudo
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "candidato_id", nullable = false, updatable = false)
	private Candidato participante;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "visita_prevista_id", nullable = false, updatable = false)
	private VisitaPrevista visitaPrevista;

	@Column(name = "data_hora", nullable = false)
	private LocalDateTime dataHora;

	@Column(length = 120)
	private String local;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private StatusVisita status = StatusVisita.AGENDADA;

	// RF13: motivo do cancelamento ou anotação do registro
	@Column(length = 500)
	private String observacao;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "agendada_por_id", nullable = false, updatable = false)
	private Usuario agendadaPor;

	@Column(name = "status_registrado_em")
	private LocalDateTime statusRegistradoEm;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "status_registrado_por_id")
	private Usuario statusRegistradoPor;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected Visita() {
		// exigido pelo JPA
	}

	public Visita(Candidato participante, VisitaPrevista visitaPrevista, LocalDateTime dataHora, String local,
			Usuario agendadaPor) {
		this.participante = participante;
		this.visitaPrevista = visitaPrevista;
		this.dataHora = dataHora;
		this.local = local;
		this.agendadaPor = agendadaPor;
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

	// As validações (estado da visita, janela) ficam no VisitaService
	public void reagendar(LocalDateTime dataHora, String local) {
		this.dataHora = dataHora;
		this.local = local;
	}

	// RF13: realizada, ausente ou cancelada
	public void registrarStatus(StatusVisita status, String observacao, Usuario responsavel) {
		this.status = status;
		this.observacao = observacao;
		this.statusRegistradoPor = responsavel;
		this.statusRegistradoEm = LocalDateTime.now();
	}

	public Long getId() {
		return id;
	}

	public Candidato getParticipante() {
		return participante;
	}

	public VisitaPrevista getVisitaPrevista() {
		return visitaPrevista;
	}

	public LocalDateTime getDataHora() {
		return dataHora;
	}

	public String getLocal() {
		return local;
	}

	public StatusVisita getStatus() {
		return status;
	}

	public String getObservacao() {
		return observacao;
	}

	public Usuario getAgendadaPor() {
		return agendadaPor;
	}

	public LocalDateTime getStatusRegistradoEm() {
		return statusRegistradoEm;
	}

	public Usuario getStatusRegistradoPor() {
		return statusRegistradoPor;
	}

	public LocalDateTime getCriadoEm() {
		return criadoEm;
	}

	public LocalDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
