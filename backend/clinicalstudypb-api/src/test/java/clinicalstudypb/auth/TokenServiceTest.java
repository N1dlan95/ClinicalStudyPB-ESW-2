package clinicalstudypb.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;

class TokenServiceTest {

	private static final String SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";

	private final JwtConfig config = new JwtConfig(SEGREDO);
	private final TokensRevogados revogados = new TokensRevogados();
	private final JwtDecoder decoder = config.jwtDecoder(revogados);

	@Test
	void tokenGeradoTemOIdDoUsuarioEOPerfil() {
		TokenService servico = new TokenService(config.jwtEncoder(), Duration.ofHours(8));

		TokenService.TokenGerado gerado = servico.gerar(usuario(5L, Perfil.COORDENADOR));
		Jwt jwt = decoder.decode(gerado.valor());

		assertThat(jwt.getSubject()).isEqualTo("5");
		assertThat(jwt.getClaimAsString("perfil")).isEqualTo("COORDENADOR");
		assertThat(jwt.getId()).isNotBlank();
		assertThat(jwt.getExpiresAt()).isEqualTo(gerado.expiraEm());
		assertThat(gerado.expiraEm()).isBetween(Instant.now().plus(Duration.ofHours(7)), Instant.now().plus(Duration.ofHours(9)));
	}

	@Test
	void tokenExpiradoERecusado() {
		Instant agora = Instant.now();
		JwtClaimsSet dados = JwtClaimsSet.builder()
				.subject("1")
				.issuedAt(agora.minus(Duration.ofHours(2)))
				.expiresAt(agora.minus(Duration.ofHours(1)))
				.build();
		String token = config.jwtEncoder()
				.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), dados))
				.getTokenValue();

		assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtValidationException.class);
	}

	@Test
	void tokenRevogadoNoLogoutERecusado() {
		TokenService servico = new TokenService(config.jwtEncoder(), Duration.ofHours(8));
		String token = servico.gerar(usuario(1L, Perfil.PESQUISADOR)).valor();
		Jwt jwt = decoder.decode(token);

		revogados.revogar(jwt.getId(), jwt.getExpiresAt());

		assertThatThrownBy(() -> decoder.decode(token))
				.isInstanceOf(JwtValidationException.class)
				.hasMessageContaining("Sessão encerrada");
	}

	@Test
	void tokenAssinadoComOutroSegredoERecusado() {
		JwtConfig outraConfig = new JwtConfig("outro-segredo-tambem-com-mais-de-32-caracteres");
		String token = new TokenService(outraConfig.jwtEncoder(), Duration.ofHours(8))
				.gerar(usuario(1L, Perfil.PESQUISADOR)).valor();

		assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(Exception.class);
	}

	@Test
	void segredoCurtoImpedeASubidaDaAplicacao() {
		assertThatThrownBy(() -> new JwtConfig("curto"))
				.isInstanceOf(IllegalStateException.class);
	}

	private static Usuario usuario(Long id, Perfil perfil) {
		Usuario usuario = new Usuario("Teste", "teste@teste.com", null, perfil, "hash");
		ReflectionTestUtils.setField(usuario, "id", id);
		return usuario;
	}

}
