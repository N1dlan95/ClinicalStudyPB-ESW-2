package clinicalstudypb.visitaprevista;

import java.util.ArrayList;
import java.util.List;

import clinicalstudypb.estudo.Estudo;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "visita_prevista", uniqueConstraints = {
		@UniqueConstraint(name = "uk_visita_estudo_ordem", columnNames = { "estudo_id", "ordem" })
})
public class VisitaPrevista {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "estudo_id", nullable = false, updatable = false)
	private Estudo estudo;

	@Column(nullable = false)
	private int ordem;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(name = "dia_previsto", nullable = false)
	private int diaPrevisto;

	@Column(name = "janela_dias")
	private Integer janelaDias;

	@Column(length = 500)
	private String descricao;

	@OneToMany(mappedBy = "visitaPrevista", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("ordem ASC")
	private List<Atividade> atividades = new ArrayList<>();

	protected VisitaPrevista() {
		// exigido pelo JPA
	}

	public VisitaPrevista(Estudo estudo, int ordem, String nome, int diaPrevisto, Integer janelaDias, String descricao) {
		this.estudo = estudo;
		atualizarDados(ordem, nome, diaPrevisto, janelaDias, descricao);
	}

	public void atualizarDados(int ordem, String nome, int diaPrevisto, Integer janelaDias, String descricao) {
		this.ordem = ordem;
		this.nome = nome;
		this.diaPrevisto = diaPrevisto;
		this.janelaDias = janelaDias;
		this.descricao = descricao;
	}

	public void substituirAtividades(List<Atividade> novasAtividades) {
		atividades.clear();
		for (Atividade atividade : novasAtividades) {
			atividade.definirVisita(this);
			atividades.add(atividade);
		}
	}

	public void limparAtividades() {
		atividades.clear();
	}

	public Long getId() {
		return id;
	}

	public Estudo getEstudo() {
		return estudo;
	}

	public int getOrdem() {
		return ordem;
	}

	public String getNome() {
		return nome;
	}

	public int getDiaPrevisto() {
		return diaPrevisto;
	}

	public Integer getJanelaDias() {
		return janelaDias;
	}

	public String getDescricao() {
		return descricao;
	}

	public List<Atividade> getAtividades() {
		return atividades;
	}
}
