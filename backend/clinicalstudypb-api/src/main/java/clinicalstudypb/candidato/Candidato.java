package clinicalstudypb.candidato;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.estudo.Estudo;
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
@Table(name = "candidato")
public class Candidato {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estudo_id", nullable = false, updatable = false)
	private Estudo estudo;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(nullable = false)
	private String email;

	@Column(length = 20)
	private String telefone;

	@Column(name = "data_nascimento", nullable = false)
	private LocalDate dataNascimento;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private StatusCandidato status = StatusCandidato.CADASTRADO;

	// Conta do participante, criada só depois da inclusão (Sprint 3)
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "usuario_id")
	private Usuario usuario;

	// RF09: quando e por quem foi feita a avaliação de elegibilidade mais recente
	@Column(name = "avaliado_em")
	private LocalDateTime avaliadoEm;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "avaliado_por_id")
	private Usuario avaliadoPor;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected Candidato() {
		// exigido pelo JPA
	}

	public Candidato(Estudo estudo, String nome, String email, String telefone, LocalDate dataNascimento) {
		this.estudo = estudo;
		atualizarDados(nome, email, telefone, dataNascimento);
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

	// Não altera o status: ele muda pela avaliação, inclusão e retirada
	public void atualizarDados(String nome, String email, String telefone, LocalDate dataNascimento) {
		this.nome = nome;
		this.email = email;
		this.telefone = telefone;
		this.dataNascimento = dataNascimento;
	}

	// RF09: o resultado da avaliação vira o status do candidato (ELEGIVEL ou INELEGIVEL)
	public void registrarAvaliacao(boolean elegivel, Usuario avaliador) {
		this.status = elegivel ? StatusCandidato.ELEGIVEL : StatusCandidato.INELEGIVEL;
		this.avaliadoPor = avaliador;
		this.avaliadoEm = LocalDateTime.now();
	}

	public LocalDateTime getAvaliadoEm() {
		return avaliadoEm;
	}

	public Usuario getAvaliadoPor() {
		return avaliadoPor;
	}

	public Long getId() {
		return id;
	}

	public Estudo getEstudo() {
		return estudo;
	}

	public String getNome() {
		return nome;
	}

	public String getEmail() {
		return email;
	}

	public String getTelefone() {
		return telefone;
	}

	public LocalDate getDataNascimento() {
		return dataNascimento;
	}

	public StatusCandidato getStatus() {
		return status;
	}

	public Usuario getUsuario() {
		return usuario;
	}

	public LocalDateTime getCriadoEm() {
		return criadoEm;
	}

	public LocalDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
