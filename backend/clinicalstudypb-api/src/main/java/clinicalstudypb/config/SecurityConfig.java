package clinicalstudypb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import clinicalstudypb.config.erro.RespostaNaoAutenticado;

@Configuration
public class SecurityConfig {

	// RF02: só o login é público; as demais rotas exigem o token JWT no cabeçalho Authorization.
	// As regras por perfil (RF03) entram na task 3221.
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter conversorJwt,
			RespostaNaoAutenticado respostaNaoAutenticado) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(rotas -> rotas
				.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
				.requestMatchers("/error").permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(servidor -> servidor
				.jwt(jwt -> jwt.jwtAuthenticationConverter(conversorJwt))
				.authenticationEntryPoint(respostaNaoAutenticado))
			.exceptionHandling(excecoes -> excecoes.authenticationEntryPoint(respostaNaoAutenticado));
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
