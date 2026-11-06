package clinicalstudypb.visitaprevista;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

@SpringBootTest
@AutoConfigureMockMvc
class VisitaPrevistaIntegrationTest {

	private static final String CORPO_VISITA = """
			{"ordem":1,"nome":"Visita de triagem","diaPrevisto":0,"janelaDias":2,
			 "descricao":"Avaliação inicial","atividades":[{"ordem":1,"descricao":"Coleta de sangue"}]}
			""";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private UsuarioRepository usuarios;

	@Autowired
	private EstudoRepository estudos;

	@Autowired
	private VisitaPrevistaRepository visitas;

	@Autowired
	private JdbcTemplate jdbc;

	private final List<Long> usuariosCriados = new ArrayList<>();

	private String sufixo;
	private Usuario responsavel;
	private Long estudoId;
	private Long visitaId;

	@BeforeEach
	void prepararDados() {
		sufixo = UUID.randomUUID().toString();
		responsavel = usuarios.save(
				new Usuario("Responsável RF06", "responsavel." + sufixo + "@clinical.test", null, Perfil.PESQUISADOR, "hash"));
		usuariosCriados.add(responsavel.getId());
		Estudo estudo = estudos.save(new Estudo("Estudo RF06", "Objetivo do teste de integração",
				responsavel, LocalDate.now(), null, 10));
		estudoId = estudo.getId();

		VisitaPrevista visita = new VisitaPrevista(estudo, 1, "Visita de triagem", 0, 2,
				"Avaliação inicial");
		visita.substituirAtividades(List.of(new Atividade(1, "Coleta de sangue")));
		visitaId = visitas.saveAndFlush(visita).getId();
	}

	// Apaga só o que o teste criou: o banco é compartilhado com os outros testes de integração
	@AfterEach
	void limparDados() {
		jdbc.update("delete from visita_prevista where estudo_id = ?", estudoId);
		jdbc.update("delete from estudo where id = ?", estudoId);
		usuariosCriados.forEach(id -> jdbc.update("delete from usuario where id = ?", id));
	}

	@Test
	void listarVisitaComAtividadesUsandoBancoReal() throws Exception {
		mvc.perform(comToken(get("/estudos/" + estudoId + "/visitas-previstas"), Perfil.PESQUISADOR))
				.andExpect(status().isOk());
	}

	@Test
	void atualizarMantendoMesmaOrdemDaAtividadeUsandoBancoReal() throws Exception {
		mvc.perform(comToken(
				put("/estudos/" + estudoId + "/visitas-previstas/" + visitaId)
						.contentType(MediaType.APPLICATION_JSON)
						.content(CORPO_VISITA),
				Perfil.PESQUISADOR))
				.andExpect(status().isOk());
	}

	@Test
	void pesquisadorGerenciaVisitasPrevistas() throws Exception {
		mvc.perform(comToken(get("/estudos/" + estudoId + "/visitas-previstas"), Perfil.PESQUISADOR))
				.andExpect(status().isOk());
		// Ordem 2: a ordem 1 já é da visita criada em prepararDados, e o serviço não aceita repetição
		mvc.perform(comToken(post("/estudos/" + estudoId + "/visitas-previstas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VISITA.replace("\"ordem\":1,\"nome\"", "\"ordem\":2,\"nome\"")), Perfil.PESQUISADOR))
				.andExpect(status().isCreated());
		mvc.perform(comToken(put("/estudos/" + estudoId + "/visitas-previstas/" + visitaId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VISITA), Perfil.PESQUISADOR))
				.andExpect(status().isOk());
		mvc.perform(comToken(delete("/estudos/" + estudoId + "/visitas-previstas/" + visitaId),
				Perfil.PESQUISADOR))
				.andExpect(status().isNoContent());
	}

	@Test
	void coordenadorENaoGerenciamVisitasPrevistas() throws Exception {
		verificar403EmTodasAsOperacoes(Perfil.COORDENADOR);
		verificar403EmTodasAsOperacoes(Perfil.ADMINISTRADOR);
	}

	@Test
	void semTokenRecebe401EmTodasAsOperacoes() throws Exception {
		mvc.perform(get("/estudos/" + estudoId + "/visitas-previstas"))
				.andExpect(status().isUnauthorized());
		mvc.perform(post("/estudos/" + estudoId + "/visitas-previstas")
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA))
				.andExpect(status().isUnauthorized());
		mvc.perform(put("/estudos/" + estudoId + "/visitas-previstas/" + visitaId)
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA))
				.andExpect(status().isUnauthorized());
		mvc.perform(delete("/estudos/" + estudoId + "/visitas-previstas/" + visitaId))
				.andExpect(status().isUnauthorized());
	}

	private void verificar403EmTodasAsOperacoes(Perfil perfil) throws Exception {
		mvc.perform(comToken(get("/estudos/" + estudoId + "/visitas-previstas"), perfil))
				.andExpect(status().isForbidden());
		mvc.perform(comToken(post("/estudos/" + estudoId + "/visitas-previstas")
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA), perfil))
				.andExpect(status().isForbidden());
		mvc.perform(comToken(put("/estudos/" + estudoId + "/visitas-previstas/" + visitaId)
				.contentType(MediaType.APPLICATION_JSON).content(CORPO_VISITA), perfil))
				.andExpect(status().isForbidden());
		mvc.perform(comToken(delete("/estudos/" + estudoId + "/visitas-previstas/" + visitaId), perfil))
				.andExpect(status().isForbidden());
	}

	private MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder requisicao, Perfil perfil) {
		Usuario usuario;
		if (perfil == Perfil.PESQUISADOR) {
			usuario = responsavel;
		} else {
			String email = perfil.name().toLowerCase() + "." + sufixo + "@clinical.test";
			usuario = usuarios.findByEmailIgnoreCase(email).orElseGet(() -> {
				Usuario criado = usuarios.save(new Usuario(perfil.name(), email, null, perfil, "hash"));
				usuariosCriados.add(criado.getId());
				return criado;
			});
		}
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}
}
