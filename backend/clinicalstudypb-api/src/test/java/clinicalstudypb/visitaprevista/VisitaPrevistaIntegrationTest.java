package clinicalstudypb.visitaprevista;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import clinicalstudypb.auth.TokenService;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.estudo.EstudoRepository;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;
import jakarta.persistence.EntityManager;

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
	private EntityManager entityManager;

	private Long estudoId;
	private Long visitaId;

	@BeforeEach
	void prepararDados() {
		visitas.deleteAll();
		estudos.deleteAll();
		usuarios.deleteAll();
		entityManager.flush();

		Usuario responsavel = usuarios.save(
				new Usuario("Responsável RF06", "responsavel.rf06@clinical.test", null, Perfil.PESQUISADOR, "hash"));
		Estudo estudo = estudos.save(new Estudo("Estudo RF06", "Objetivo do teste de integração",
				responsavel, LocalDate.now(), null, 10));
		estudoId = estudo.getId();

		VisitaPrevista visita = new VisitaPrevista(estudo, 1, "Visita de triagem", 0, 2,
				"Avaliação inicial");
		visita.substituirAtividades(List.of(new Atividade(1, "Coleta de sangue")));
		visitaId = visitas.saveAndFlush(visita).getId();
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
		mvc.perform(comToken(post("/estudos/" + estudoId + "/visitas-previstas")
				.contentType(MediaType.APPLICATION_JSON)
				.content(CORPO_VISITA), Perfil.PESQUISADOR))
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
			usuario = usuarios.findAll().getFirst();
		} else {
			String email = perfil.name().toLowerCase() + ".rf06@clinical.test";
			usuario = usuarios.findByEmailIgnoreCase(email).orElseGet(() -> usuarios.save(
					new Usuario(perfil.name(), email, null, perfil, "hash")));
		}
		return requisicao.header("Authorization", "Bearer " + tokens.gerar(usuario).valor());
	}
}
