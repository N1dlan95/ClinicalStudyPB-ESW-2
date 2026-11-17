package clinicalstudypb.conta;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.conta.dto.ContaParticipanteResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3751 (T-85): conta do participante. A conta é criada pelo sistema quando o candidato é incluído
// (RF11) e liga o candidato a um usuário PARTICIPANTE, que entra no app (RF02, RF17, RF18).
// A conta é identificada pelo e-mail: quem é incluído em um segundo estudo reaproveita a mesma conta.
@Service
public class ContaParticipanteService {

	private final UsuarioRepository usuarios;
	private final CandidatoRepository candidatos;
	private final PasswordEncoder codificadorSenha;
	private final GeradorSenhaProvisoria geradorSenha;

	public ContaParticipanteService(UsuarioRepository usuarios, CandidatoRepository candidatos,
			PasswordEncoder codificadorSenha, GeradorSenhaProvisoria geradorSenha) {
		this.usuarios = usuarios;
		this.candidatos = candidatos;
		this.codificadorSenha = codificadorSenha;
		this.geradorSenha = geradorSenha;
	}

	// Chamado pela inclusão, dentro da mesma transação. Se o e-mail já pertence a alguém da equipe
	// (administrador, pesquisador ou coordenador), a inclusão é recusada: um mesmo usuário não pode ter dois perfis.
	@Transactional
	public ContaParticipanteResponse vincularOuCriar(Candidato candidato) {
		String email = normalizarEmail(candidato.getEmail());
		Usuario existente = usuarios.findByEmailIgnoreCase(email).orElse(null);
		if (existente != null) {
			if (existente.getPerfil() != Perfil.PARTICIPANTE) {
				throw new RegraNegocioException("EMAIL_DE_OUTRO_PERFIL",
						"O e-mail do candidato já pertence a um usuário da equipe. Corrija o e-mail antes de incluir",
						HttpStatus.CONFLICT);
			}
			candidato.vincularConta(existente);
			return resposta(existente, true, null);
		}
		String senha = geradorSenha.gerar();
		Usuario conta = usuarios.save(new Usuario(candidato.getNome().trim(), email, null, Perfil.PARTICIPANTE,
				codificadorSenha.encode(senha)));
		candidato.vincularConta(conta);
		return resposta(conta, false, senha);
	}

	@Transactional(readOnly = true)
	public ContaParticipanteResponse consultar(Long candidatoId) {
		Usuario conta = contaDoCandidato(candidatoId);
		return resposta(conta, true, null);
	}

	// Para o participante que perdeu a senha: o coordenador gera outra e entrega a ele
	@Transactional
	public ContaParticipanteResponse redefinirSenha(Long candidatoId) {
		Usuario conta = contaDoCandidato(candidatoId);
		String senha = geradorSenha.gerar();
		conta.definirSenhaHash(codificadorSenha.encode(senha));
		return resposta(conta, true, senha);
	}

	private Usuario contaDoCandidato(Long candidatoId) {
		Candidato candidato = candidatos.findById(candidatoId)
				.orElseThrow(() -> new RecursoNaoEncontradoException("Candidato não encontrado"));
		if (candidato.getUsuario() == null) {
			throw new RecursoNaoEncontradoException("Este candidato ainda não tem conta de participante");
		}
		return candidato.getUsuario();
	}

	private static ContaParticipanteResponse resposta(Usuario conta, boolean contaExistente, String senhaProvisoria) {
		return new ContaParticipanteResponse(conta.getId(), conta.getEmail(), conta.isAtivo(), contaExistente,
				senhaProvisoria);
	}

	private static String normalizarEmail(String email) {
		return email.trim().toLowerCase();
	}

}
