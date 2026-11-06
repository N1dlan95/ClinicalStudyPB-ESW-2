package clinicalstudypb.avaliacao;

import static clinicalstudypb.criterio.TipoCriterio.EXCLUSAO;
import static clinicalstudypb.criterio.TipoCriterio.INCLUSAO;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import clinicalstudypb.avaliacao.RegraElegibilidade.Resposta;

// RF09 / task 3568: combinações de critérios de inclusão e exclusão
class RegraElegibilidadeTest {

	static Stream<Arguments> combinacoes() {
		return Stream.of(
				Arguments.of("uma inclusão atendida", List.of(new Resposta(INCLUSAO, true)), true),
				Arguments.of("uma inclusão não atendida", List.of(new Resposta(INCLUSAO, false)), false),
				Arguments.of("todas as inclusões atendidas",
						List.of(new Resposta(INCLUSAO, true), new Resposta(INCLUSAO, true), new Resposta(INCLUSAO, true)),
						true),
				Arguments.of("uma de três inclusões não atendida",
						List.of(new Resposta(INCLUSAO, true), new Resposta(INCLUSAO, false), new Resposta(INCLUSAO, true)),
						false),
				Arguments.of("inclusões atendidas e nenhuma exclusão presente",
						List.of(new Resposta(INCLUSAO, true), new Resposta(EXCLUSAO, false), new Resposta(EXCLUSAO, false)),
						true),
				Arguments.of("inclusões atendidas e uma exclusão presente",
						List.of(new Resposta(INCLUSAO, true), new Resposta(EXCLUSAO, false), new Resposta(EXCLUSAO, true)),
						false),
				Arguments.of("inclusão não atendida e exclusão presente",
						List.of(new Resposta(INCLUSAO, false), new Resposta(EXCLUSAO, true)), false),
				Arguments.of("inclusão não atendida e nenhuma exclusão",
						List.of(new Resposta(INCLUSAO, false), new Resposta(EXCLUSAO, false)), false),
				Arguments.of("todas as exclusões presentes",
						List.of(new Resposta(INCLUSAO, true), new Resposta(EXCLUSAO, true), new Resposta(EXCLUSAO, true)),
						false));
	}

	@ParameterizedTest(name = "{0} -> elegível: {2}")
	@MethodSource("combinacoes")
	void calculaOResultadoDaAvaliacao(String caso, List<Resposta> respostas, boolean esperado) {
		assertThat(RegraElegibilidade.elegivel(respostas)).isEqualTo(esperado);
	}

}
