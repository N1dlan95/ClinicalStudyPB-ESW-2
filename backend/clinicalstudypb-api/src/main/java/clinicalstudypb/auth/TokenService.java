package clinicalstudypb.auth;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import clinicalstudypb.usuario.Usuario;

@Service
public class TokenService {

	private final JwtEncoder codificador;
	private final Duration expiracao;

	public TokenService(JwtEncoder codificador, @Value("${clinicalstudypb.jwt.expiracao}") Duration expiracao) {
		this.codificador = codificador;
		this.expiracao = expiracao;
	}

	// O subject é o id do usuário; o perfil vai no token para o controle de acesso não consultar o banco
	public TokenGerado gerar(Usuario usuario) {
		// O JWT guarda as datas em segundos; truncar mantém o expiraEm da resposta igual ao do token
		Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
		Instant expiraEm = agora.plus(expiracao);
		JwtClaimsSet dados = JwtClaimsSet.builder()
				.id(UUID.randomUUID().toString())
				.issuer("clinicalstudypb-api")
				.subject(usuario.getId().toString())
				.issuedAt(agora)
				.expiresAt(expiraEm)
				.claim(JwtConfig.CLAIM_PERFIL, usuario.getPerfil().name())
				.build();
		JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = codificador.encode(JwtEncoderParameters.from(cabecalho, dados)).getTokenValue();
		return new TokenGerado(token, expiraEm);
	}

	public record TokenGerado(String valor, Instant expiraEm) {
	}

}
