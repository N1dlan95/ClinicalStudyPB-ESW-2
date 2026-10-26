package clinicalstudypb.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import clinicalstudypb.config.erro.RespostaNaoAutenticado;
import clinicalstudypb.config.erro.RespostaSemPermissao;
import clinicalstudypb.usuario.Perfil;

@Configuration
public class SecurityConfig {

	private static final String ADMINISTRADOR = Perfil.ADMINISTRADOR.name();
	private static final String PESQUISADOR = Perfil.PESQUISADOR.name();
	private static final String COORDENADOR = Perfil.COORDENADOR.name();

	// RF02: só o login é público; as demais rotas exigem o token JWT no cabeçalho Authorization.
	// RF03: cada rota libera apenas os perfis previstos na especificação e no openapi.yaml.
	// O perfil vem da claim "perfil" do token, convertida em ROLE_<PERFIL> pelo JwtConfig.
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter conversorJwt,
			RespostaNaoAutenticado respostaNaoAutenticado, RespostaSemPermissao respostaSemPermissao)
			throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.cors(Customizer.withDefaults())
			.sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(rotas -> rotas
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
				.requestMatchers("/error").permitAll()
				// Autenticação: qualquer perfil logado
				.requestMatchers("/auth/**").authenticated()
				// RF01: usuários e perfis, somente administrador
				.requestMatchers("/usuarios", "/usuarios/**", "/perfis").hasRole(ADMINISTRADOR)
				// RF04: o pesquisador cadastra e edita estudos; pesquisador, coordenador e administrador consultam
				.requestMatchers(HttpMethod.GET, "/estudos", "/estudos/**").hasAnyRole(PESQUISADOR, COORDENADOR, ADMINISTRADOR)
				.requestMatchers(HttpMethod.POST, "/estudos").hasRole(PESQUISADOR)
				.requestMatchers(HttpMethod.PUT, "/estudos/**").hasRole(PESQUISADOR)
				// Rota sem regra explícita fica bloqueada até ser liberada aqui
				.anyRequest().denyAll())
			.oauth2ResourceServer(servidor -> servidor
				.jwt(jwt -> jwt.jwtAuthenticationConverter(conversorJwt))
				.authenticationEntryPoint(respostaNaoAutenticado)
				.accessDeniedHandler(respostaSemPermissao))
			.exceptionHandling(excecoes -> excecoes
				.authenticationEntryPoint(respostaNaoAutenticado)
				.accessDeniedHandler(respostaSemPermissao));
		return http.build();
	}

	// Origens da web e do mobile em desenvolvimento que podem chamar a API direto pelo navegador
	@Bean
	CorsConfigurationSource corsConfigurationSource(@Value("${clinicalstudypb.cors.origens}") List<String> origens) {
		CorsConfiguration cors = new CorsConfiguration();
		cors.setAllowedOrigins(origens);
		cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
		fonte.registerCorsConfiguration("/**", cors);
		return fonte;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
