package clinicalstudypb.auth;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

// RF02: geração e validação dos tokens JWT (assinatura HS256 com segredo compartilhado)
@Configuration
public class JwtConfig {

	static final String CLAIM_PERFIL = "perfil";

	private final SecretKey chave;

	public JwtConfig(@Value("${clinicalstudypb.jwt.segredo}") String segredo) {
		byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("clinicalstudypb.jwt.segredo deve ter pelo menos 32 caracteres");
		}
		this.chave = new SecretKeySpec(bytes, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder() {
		return NimbusJwtEncoder.withSecretKey(chave).algorithm(MacAlgorithm.HS256).build();
	}

	// Além da assinatura e da expiração, recusa tokens encerrados no logout
	@Bean
	JwtDecoder jwtDecoder(TokensRevogados tokensRevogados) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(MacAlgorithm.HS256).build();
		OAuth2TokenValidator<Jwt> naoRevogado = jwt -> tokensRevogados.estaRevogado(jwt.getId())
				? OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Sessão encerrada", null))
				: OAuth2TokenValidatorResult.success();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), naoRevogado));
		return decoder;
	}

	// O perfil do token vira a autoridade ROLE_<PERFIL>, usada no controle de acesso (RF03)
	@Bean
	JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter autoridades = new JwtGrantedAuthoritiesConverter();
		autoridades.setAuthoritiesClaimName(CLAIM_PERFIL);
		autoridades.setAuthorityPrefix("ROLE_");
		JwtAuthenticationConverter conversor = new JwtAuthenticationConverter();
		conversor.setJwtGrantedAuthoritiesConverter(autoridades);
		return conversor;
	}

}
