package clinicalstudypb.usuario;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(nullable = false)
	private String email;

	@Column(length = 50)
	private String matricula;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Perfil perfil;

	@Column(name = "senha_hash", nullable = false, length = 100)
	private String senhaHash;

	@Column(nullable = false)
	private boolean ativo = true;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime atualizadoEm;

	protected Usuario() {
		// exigido pelo JPA
	}

	public Usuario(String nome, String email, String matricula, Perfil perfil, String senhaHash) {
		this.nome = nome;
		this.email = email;
		this.matricula = matricula;
		this.perfil = perfil;
		this.senhaHash = senhaHash;
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

	public void atualizarDados(String nome, String email, String matricula, Perfil perfil) {
		this.nome = nome;
		this.email = email;
		this.matricula = matricula;
		this.perfil = perfil;
	}

	public void definirAtivo(boolean ativo) {
		this.ativo = ativo;
	}

	public Long getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getEmail() {
		return email;
	}

	public String getMatricula() {
		return matricula;
	}

	public Perfil getPerfil() {
		return perfil;
	}

	public String getSenhaHash() {
		return senhaHash;
	}

	public boolean isAtivo() {
		return ativo;
	}

	public LocalDateTime getCriadoEm() {
		return criadoEm;
	}

	public LocalDateTime getAtualizadoEm() {
		return atualizadoEm;
	}

}
