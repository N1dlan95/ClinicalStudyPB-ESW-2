package clinicalstudypb.candidato;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import clinicalstudypb.auth.JwtConfig;
import clinicalstudypb.auth.TokensRevogados;
import clinicalstudypb.candidato.dto.CandidatoRequest;
import clinicalstudypb.config.SecurityConfig;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.estudo.EstadoEstudo;

@WebMvcTest(CandidatoController.class)
@Import({ SecurityConfig.class, JwtConfig.class, TokensRevogados.class, RespostaNaoAutenticado.class,
		RespostaSemPermissao.class })
@WithMockUser(roles = "COORDENADOR")
class CandidatoControllerTest {

	private static final String CORPO_VALIDO = """
			{"nome": "João Silva", "email": "joao@teste.com", "telefone": "(83) 99999-0000",
			 "dataNascimento": "1990-05-20"}
			""";

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private CandidatoService servico;

	@Test
	void criarRetorna201ComOCandidatoCadastrado() throws Exception {
		when(servico.criar(eq(1L), any(CandidatoRequest.class))).thenReturn(candidato(7L));

		mvc.perform(post("/estudos/1/candidatos").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "/api/estudos/1/candidatos/7"))
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.estudoId").value(1))
				.andExpect(jsonPath("$.nome").value("João Silva"))
				.andExpect(jsonPath("$.email").value("joao@teste.com"))
				.andExpect(jsonPath("$.dataNascimento").value("1990-05-20"))
				.andExpect(jsonPath("$.status").value("CADASTRADO"));
	}

	@Test
	void criarSemCamposObrigatoriosRetorna400ComOsCampos() throws Exception {
		mvc.perform(post("/estudos/1/candidatos").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"))
				.andExpect(jsonPath("$.detalhes.length()").value(3));
		verifyNoInteractions(servico);
	}

	@Test
	void criarComNascimentoNoFuturoETelefoneInvalidoRetorna400() throws Exception {
		mvc.perform(post("/estudos/1/candidatos").contentType(MediaType.APPLICATION_JSON).content("""
				{"nome": "João Silva", "email": "joao@teste.com", "telefone": "abc",
				 "dataNascimento": "2999-01-01"}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detalhes[?(@.campo == 'telefone')].mensagem").value("Telefone inválido"))
				.andExpect(jsonPath("$.detalhes[?(@.campo == 'dataNascimento')].mensagem")
						.value("A data de nascimento deve ser anterior a hoje"));
	}

	@Test
	void criarComEstudoForaDeRecrutamentoRetorna409() throws Exception {
		when(servico.criar(eq(1L), any(CandidatoRequest.class))).thenThrow(new RegraNegocioException(
				"ESTUDO_FORA_DE_RECRUTAMENTO", "Só é possível cadastrar candidatos com o estudo em recrutamento",
				HttpStatus.CONFLICT));

		mvc.perform(post("/estudos/1/candidatos").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_DE_RECRUTAMENTO"));
	}

	@Test
	void criarComEmailRepetidoNoEstudoRetorna409() throws Exception {
		when(servico.criar(eq(1L), any(CandidatoRequest.class))).thenThrow(new RegraNegocioException(
				"EMAIL_DUPLICADO_NO_ESTUDO", "Já existe um candidato com este e-mail neste estudo",
				HttpStatus.CONFLICT));

		mvc.perform(post("/estudos/1/candidatos").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("EMAIL_DUPLICADO_NO_ESTUDO"))
				.andExpect(jsonPath("$.mensagem").value("Já existe um candidato com este e-mail neste estudo"));
	}

	@Test
	void listarComFiltroDeStatusRetornaPagina() throws Exception {
		when(servico.listar(eq(1L), eq(StatusCandidato.ELEGIVEL), any()))
				.thenReturn(new PageImpl<>(List.of(candidato(7L)), PageRequest.of(0, 20), 1));

		mvc.perform(get("/estudos/1/candidatos").param("status", "ELEGIVEL"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].id").value(7))
				.andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	void listarComStatusInexistenteRetorna400() throws Exception {
		mvc.perform(get("/estudos/1/candidatos").param("status", "APROVADO"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.codigo").value("VALIDACAO"));
	}

	@Test
	void buscarInexistenteRetorna404() throws Exception {
		when(servico.buscar(1L, 99L)).thenThrow(new RecursoNaoEncontradoException("Candidato não encontrado"));

		mvc.perform(get("/estudos/1/candidatos/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.codigo").value("NAO_ENCONTRADO"));
	}

	@Test
	void atualizarRetorna200() throws Exception {
		when(servico.atualizar(eq(1L), eq(7L), any(CandidatoRequest.class))).thenReturn(candidato(7L));

		mvc.perform(put("/estudos/1/candidatos/7").contentType(MediaType.APPLICATION_JSON).content(CORPO_VALIDO))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(7));
	}

	private static Candidato candidato(Long id) {
		return CandidatoServiceTest.candidato(id, CandidatoServiceTest.estudo(1L, EstadoEstudo.RECRUTAMENTO),
				StatusCandidato.CADASTRADO);
	}

}
