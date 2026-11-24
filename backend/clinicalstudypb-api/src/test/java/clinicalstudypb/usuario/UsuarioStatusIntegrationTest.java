package clinicalstudypb.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.TokenService;

@SpringBootTest
@AutoConfigureMockMvc
class UsuarioStatusIntegrationTest {

	private static final String SENHA = "SenhaSegura123";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private TokenService tokens;

	@Autowired
	private PasswordEncoder codificadorSenha;

	@Autowired
	private UsuarioRepository usuarios;

	private Usuario administrador;
	private Usuario outroUsuario;
	private String emailAdministrador;

	@BeforeEach
	void prepararDados() {
		String sufixo = UUID.randomUUID().toString();
		emailAdministrador = "admin." + sufixo + "@clinical.test";
		administrador = usuarios.saveAndFlush(new Usuario("Administrador Bug Bash", emailAdministrador, null,
				Perfil.ADMINISTRADOR, codificadorSenha.encode(SENHA)));
		outroUsuario = usuarios.saveAndFlush(new Usuario("Pesquisador Bug Bash",
				"pesquisador." + sufixo + "@clinical.test", null, Perfil.PESQUISADOR, "hash"));
	}

	@AfterEach
	void limparDados() {
		usuarios.delete(outroUsuario);
		usuarios.delete(administrador);
	}

	@Test
	void administradorNaoPodeDesativarAPropriaContaPelaApiMasPodeDesativarOutra() throws Exception {
		String token = tokens.gerar(administrador).valor();

		mvc.perform(patch("/usuarios/" + administrador.getId() + "/status")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ativo\": false}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("USUARIO_PROPRIO_DESATIVACAO"))
				.andExpect(jsonPath("$.mensagem").value("Você não pode desativar o próprio usuário."));

		assertThat(usuarios.findById(administrador.getId()).orElseThrow().isAtivo()).isTrue();
		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("""
				{"email":"%s","senha":"%s"}
				""".formatted(emailAdministrador, SENHA)))
				.andExpect(status().isOk());

		mvc.perform(patch("/usuarios/" + outroUsuario.getId() + "/status")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"ativo\": false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ativo").value(false));
		assertThat(usuarios.findById(outroUsuario.getId()).orElseThrow().isAtivo()).isFalse();
	}
}
