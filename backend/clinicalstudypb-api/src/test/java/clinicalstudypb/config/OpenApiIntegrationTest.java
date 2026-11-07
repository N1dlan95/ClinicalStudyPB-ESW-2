package clinicalstudypb.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokenService;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.estudo.EstudoController;
import clinicalstudypb.estudo.EstudoService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;

@WebMvcTest(EstudoController.class)
@ImportAutoConfiguration({
		SpringDocConfiguration.class,
		SpringDocConfigProperties.class,
		SpringDocWebMvcConfiguration.class
})
@Import({ SecurityConfig.class, OpenApiConfig.class, JwtConfig.class, TokensRevogados.class, TokenService.class,
		RespostaNaoAutenticado.class, RespostaSemPermissao.class })
class OpenApiIntegrationTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private EstudoService estudoService;

	@Test
	void documentacaoAbertaSemToken() throws Exception {
		mvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk());
	}
}
