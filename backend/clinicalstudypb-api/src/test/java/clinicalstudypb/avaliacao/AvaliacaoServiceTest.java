package clinicalstudypb.avaliacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.avaliacao.dto.AvaliacaoRequest;
import clinicalstudypb.avaliacao.dto.AvaliacaoResponse;
import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.config.erro.ValidacaoException;
import clinicalstudypb.criterio.Criterio;
import clinicalstudypb.criterio.CriterioRepository;
import clinicalstudypb.criterio.TipoCriterio;
import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AvaliacaoServiceTest {

	private static final Long COORDENADOR_ID = 3L;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private CriterioRepository criterios;

	@Mock
	private AvaliacaoCriterioRepository avaliacoes;

	@Mock
	private UsuarioRepository usuarios;

	private AvaliacaoService servico;

	private Estudo estudo;
	private Candidato candidato;
	private Criterio idade;
	private Criterio diagnostico;
	private Criterio gestante;
	private Usuario coordenador;

	@BeforeEach
	void configurar() {
		servico = new AvaliacaoService(candidatos, criterios, avaliacoes, usuarios);
		estudo = estudo(EstadoEstudo.RECRUTAMENTO);
		candidato = candidato(estudo, StatusCandidato.CADASTRADO);
		// Ids fora de ordem de propósito: a resposta deve vir com inclusão primeiro, depois exclusão
		gestante = criterio(10L, TipoCriterio.EXCLUSAO, "Gestante", 1);
		idade = criterio(11L, TipoCriterio.INCLUSAO, "Idade entre 18 e 65 anos", 1);
		diagnostico = criterio(12L, TipoCriterio.INCLUSAO, "Diagnóstico de hipertensão", 2);
		coordenador = new Usuario("Carlos Coordenador", "carlos@teste.com", null, Perfil.COORDENADOR, "hash");
		ReflectionTestUtils.setField(coordenador, "id", COORDENADOR_ID);
	}

	// ---- Resultado

	@Test
	void atendeTodasAsInclusoesENenhumaExclusaoFicaElegivel() {
		prepararAvaliacao();

		AvaliacaoResponse resposta = servico.avaliar(5L,
				respostas(r(11L, true), r(12L, true), r(10L, false)), COORDENADOR_ID);

		assertThat(resposta.status()).isEqualTo(StatusCandidato.ELEGIVEL);
		assertThat(candidato.getStatus()).isEqualTo(StatusCandidato.ELEGIVEL);
		assertThat(candidato.getAvaliadoPor()).isSameAs(coordenador);
		assertThat(candidato.getAvaliadoEm()).isNotNull();
		assertThat(resposta.avaliadoPor().nome()).isEqualTo("Carlos Coordenador");
		assertThat(resposta.criterios()).extracting(AvaliacaoResponse.Item::criterioId).containsExactly(11L, 12L, 10L);
	}

	@Test
	void naoAtendeUmaInclusaoFicaInelegivel() {
		prepararAvaliacao();

		AvaliacaoResponse resposta = servico.avaliar(5L,
				respostas(r(11L, true), r(12L, false), r(10L, false)), COORDENADOR_ID);

		assertThat(resposta.status()).isEqualTo(StatusCandidato.INELEGIVEL);
	}

	@Test
	void temCondicaoDeExclusaoFicaInelegivel() {
		prepararAvaliacao();

		AvaliacaoResponse resposta = servico.avaliar(5L,
				respostas(r(11L, true), r(12L, true), r(10L, true)), COORDENADOR_ID);

		assertThat(resposta.status()).isEqualTo(StatusCandidato.INELEGIVEL);
	}

	@Test
	void reavaliacaoApagaAsRespostasAnterioresAntesDeGravar() {
		candidato = candidato(estudo, StatusCandidato.INELEGIVEL);
		prepararAvaliacao();

		AvaliacaoResponse resposta = servico.avaliar(5L,
				respostas(r(11L, true), r(12L, true), r(10L, false)), COORDENADOR_ID);

		InOrder ordem = inOrder(avaliacoes);
		ordem.verify(avaliacoes).apagarDoCandidato(5L);
		ordem.verify(avaliacoes).saveAll(anyList());
		assertThat(resposta.status()).isEqualTo(StatusCandidato.ELEGIVEL);
	}

	@Test
	void observacaoEmBrancoFicaVazia() {
		prepararAvaliacao();

		AvaliacaoResponse resposta = servico.avaliar(5L, new AvaliacaoRequest(List.of(
				new AvaliacaoRequest.Resposta(11L, true, "  Tem 40 anos "),
				new AvaliacaoRequest.Resposta(12L, true, "   "),
				new AvaliacaoRequest.Resposta(10L, false, null))), COORDENADOR_ID);

		assertThat(resposta.criterios()).extracting(AvaliacaoResponse.Item::observacao)
				.containsExactly("Tem 40 anos", null, null);
	}

	// ---- Todos os critérios precisam ser avaliados

	@Test
	void faltandoCriterioEInvalido() {
		prepararEstudoComCriterios();

		assertThatThrownBy(() -> servico.avaliar(5L, respostas(r(11L, true), r(10L, false)), COORDENADOR_ID))
				.isInstanceOfSatisfying(ValidacaoException.class, ex -> {
					assertThat(ex.getCampo()).isEqualTo("respostas");
					assertThat(ex.getMessage()).contains("Diagnóstico de hipertensão");
				});
		verify(avaliacoes, never()).saveAll(anyList());
	}

	@Test
	void criterioDeOutroEstudoEInvalido() {
		prepararEstudoComCriterios();

		assertThatThrownBy(() -> servico.avaliar(5L,
				respostas(r(11L, true), r(12L, true), r(10L, false), r(99L, true)), COORDENADOR_ID))
				.isInstanceOf(ValidacaoException.class)
				.hasMessageContaining("não pertence a este estudo");
	}

	@Test
	void criterioRepetidoEInvalido() {
		prepararEstudoComCriterios();

		assertThatThrownBy(() -> servico.avaliar(5L,
				respostas(r(11L, true), r(11L, false), r(12L, true), r(10L, false)), COORDENADOR_ID))
				.isInstanceOf(ValidacaoException.class)
				.hasMessageContaining("mais de uma vez");
	}

	@Test
	void estudoSemCriterioDeInclusaoGeraConflito() {
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));
		when(criterios.findByEstudoId(1L)).thenReturn(List.of(gestante));

		assertThatThrownBy(() -> servico.avaliar(5L, respostas(r(10L, false)), COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("ESTUDO_SEM_CRITERIOS_DE_INCLUSAO"));
	}

	// ---- Estado do estudo e do candidato

	@ParameterizedTest
	@EnumSource(value = EstadoEstudo.class, names = "RECRUTAMENTO", mode = EnumSource.Mode.EXCLUDE)
	void estudoForaDeRecrutamentoGeraConflito(EstadoEstudo estado) {
		candidato = candidato(estudo(estado), StatusCandidato.CADASTRADO);
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));

		assertThatThrownBy(() -> servico.avaliar(5L, respostas(r(11L, true)), COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("ESTUDO_FORA_DE_RECRUTAMENTO");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
	}

	@ParameterizedTest
	@EnumSource(value = StatusCandidato.class, names = { "INCLUIDO", "RETIRADO" })
	void candidatoIncluidoOuRetiradoNaoEReavaliado(StatusCandidato status) {
		candidato = candidato(estudo, status);
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));

		assertThatThrownBy(() -> servico.avaliar(5L, respostas(r(11L, true)), COORDENADOR_ID))
				.isInstanceOfSatisfying(RegraNegocioException.class,
						ex -> assertThat(ex.getCodigo()).isEqualTo("CANDIDATO_JA_INCLUIDO"));
	}

	@Test
	void candidatoInexistenteLancaNaoEncontrado() {
		when(candidatos.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.avaliar(99L, respostas(r(11L, true)), COORDENADOR_ID))
				.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	// ---- Consulta

	@Test
	void consultarAntesDaAvaliacaoTrazOsCriteriosSemResposta() {
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));
		when(criterios.findByEstudoId(1L)).thenReturn(List.of(gestante, diagnostico, idade));
		when(avaliacoes.findByCandidatoId(5L)).thenReturn(List.of());

		AvaliacaoResponse resposta = servico.consultar(5L);

		assertThat(resposta.status()).isEqualTo(StatusCandidato.CADASTRADO);
		assertThat(resposta.avaliadoEm()).isNull();
		assertThat(resposta.avaliadoPor()).isNull();
		assertThat(resposta.criterios()).extracting(AvaliacaoResponse.Item::descricao)
				.containsExactly("Idade entre 18 e 65 anos", "Diagnóstico de hipertensão", "Gestante");
		assertThat(resposta.criterios()).extracting(AvaliacaoResponse.Item::atende).containsOnlyNulls();
	}

	@Test
	void consultarDepoisDaAvaliacaoTrazAsRespostas() {
		candidato.registrarAvaliacao(true, coordenador);
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));
		when(criterios.findByEstudoId(1L)).thenReturn(List.of(idade, gestante));
		when(avaliacoes.findByCandidatoId(5L)).thenReturn(List.of(
				new AvaliacaoCriterio(candidato, idade, true, null),
				new AvaliacaoCriterio(candidato, gestante, false, "Não é gestante")));

		AvaliacaoResponse resposta = servico.consultar(5L);

		assertThat(resposta.status()).isEqualTo(StatusCandidato.ELEGIVEL);
		assertThat(resposta.avaliadoPor().id()).isEqualTo(COORDENADOR_ID);
		assertThat(resposta.criterios()).extracting(AvaliacaoResponse.Item::atende).containsExactly(true, false);
	}

	// ---- Apoio

	private void prepararEstudoComCriterios() {
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));
		when(criterios.findByEstudoId(1L)).thenReturn(List.of(gestante, diagnostico, idade));
	}

	private void prepararAvaliacao() {
		prepararEstudoComCriterios();
		when(usuarios.findById(COORDENADOR_ID)).thenReturn(Optional.of(coordenador));
		when(avaliacoes.saveAll(anyList())).thenAnswer(chamada -> new ArrayList<>(chamada.getArgument(0)));
	}

	private static AvaliacaoRequest.Resposta r(Long criterioId, boolean atende) {
		return new AvaliacaoRequest.Resposta(criterioId, atende, null);
	}

	private static AvaliacaoRequest respostas(AvaliacaoRequest.Resposta... respostas) {
		return new AvaliacaoRequest(List.of(respostas));
	}

	private Criterio criterio(Long id, TipoCriterio tipo, String descricao, int ordem) {
		Criterio criterio = new Criterio(estudo, tipo, descricao, ordem);
		ReflectionTestUtils.setField(criterio, "id", id);
		return criterio;
	}

	private static Estudo estudo(EstadoEstudo estado) {
		Usuario pesquisadora = new Usuario("Ana Souza", "ana@teste.com", null, Perfil.PESQUISADOR, "hash");
		Estudo estudo = new Estudo("Estudo de hipertensão", "Objetivo", pesquisadora, LocalDate.of(2026, 11, 1), null, 30);
		ReflectionTestUtils.setField(estudo, "id", 1L);
		ReflectionTestUtils.setField(estudo, "estado", estado);
		return estudo;
	}

	private static Candidato candidato(Estudo estudo, StatusCandidato status) {
		Candidato candidato = new Candidato(estudo, "João Silva", "joao@teste.com", null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(candidato, "id", 5L);
		ReflectionTestUtils.setField(candidato, "status", status);
		return candidato;
	}

}
