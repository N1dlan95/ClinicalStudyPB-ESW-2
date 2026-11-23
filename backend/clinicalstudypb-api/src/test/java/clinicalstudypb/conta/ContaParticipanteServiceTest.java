package clinicalstudypb.conta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.CandidatoRepository;
import clinicalstudypb.conta.dto.ContaParticipanteResponse;
import clinicalstudypb.config.erro.RecursoNaoEncontradoException;
import clinicalstudypb.config.erro.RegraNegocioException;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Perfil;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.usuario.UsuarioRepository;

// Task 3778 (T-106), parte da conta: regras da conta do participante criada na inclusão (task 3751)
@ExtendWith(MockitoExtension.class)
class ContaParticipanteServiceTest {

	@Mock
	private UsuarioRepository usuarios;

	@Mock
	private CandidatoRepository candidatos;

	@Mock
	private PasswordEncoder codificadorSenha;

	@Mock
	private GeradorSenhaProvisoria geradorSenha;

	private ContaParticipanteService servico;

	@BeforeEach
	void configurar() {
		servico = new ContaParticipanteService(usuarios, candidatos, codificadorSenha, geradorSenha);
	}

	// ---- Criação na inclusão

	@Test
	void criaContaParticipanteComSenhaProvisoriaQuandoOEmailEhNovo() {
		Candidato candidato = candidato(" Joao@Teste.com ");
		when(usuarios.findByEmailIgnoreCase("joao@teste.com")).thenReturn(Optional.empty());
		when(geradorSenha.gerar()).thenReturn("Ab3dEf5hJk");
		when(codificadorSenha.encode("Ab3dEf5hJk")).thenReturn("hash-novo");
		when(usuarios.save(any(Usuario.class))).thenAnswer(chamada -> comId(chamada.getArgument(0), 40L));

		ContaParticipanteResponse conta = servico.vincularOuCriar(candidato);

		ArgumentCaptor<Usuario> salvo = ArgumentCaptor.forClass(Usuario.class);
		verify(usuarios).save(salvo.capture());
		assertThat(salvo.getValue().getPerfil()).isEqualTo(Perfil.PARTICIPANTE);
		assertThat(salvo.getValue().getEmail()).isEqualTo("joao@teste.com");
		assertThat(salvo.getValue().getNome()).isEqualTo("João Silva");
		assertThat(salvo.getValue().getSenhaHash()).isEqualTo("hash-novo");
		assertThat(salvo.getValue().isAtivo()).isTrue();
		assertThat(candidato.getUsuario()).isSameAs(salvo.getValue());
		assertThat(conta).isEqualTo(new ContaParticipanteResponse(40L, "joao@teste.com", true, false, "Ab3dEf5hJk"));
	}

	@Test
	void reaproveitaContaDeParticipanteJaExistenteSemTrocarASenha() {
		Candidato candidato = candidato("joao@teste.com");
		Usuario existente = comId(new Usuario("João", "joao@teste.com", null, Perfil.PARTICIPANTE, "hash-antigo"), 7L);
		when(usuarios.findByEmailIgnoreCase("joao@teste.com")).thenReturn(Optional.of(existente));

		ContaParticipanteResponse conta = servico.vincularOuCriar(candidato);

		assertThat(candidato.getUsuario()).isSameAs(existente);
		assertThat(existente.getSenhaHash()).isEqualTo("hash-antigo");
		assertThat(conta).isEqualTo(new ContaParticipanteResponse(7L, "joao@teste.com", true, true, null));
		verify(usuarios, never()).save(any());
		verify(geradorSenha, never()).gerar();
	}

	@Test
	void contaExistenteDesativadaContinuaDesativada() {
		Candidato candidato = candidato("joao@teste.com");
		Usuario existente = comId(new Usuario("João", "joao@teste.com", null, Perfil.PARTICIPANTE, "hash"), 7L);
		existente.definirAtivo(false);
		when(usuarios.findByEmailIgnoreCase("joao@teste.com")).thenReturn(Optional.of(existente));

		ContaParticipanteResponse conta = servico.vincularOuCriar(candidato);

		assertThat(conta.ativo()).isFalse();
		assertThat(existente.isAtivo()).isFalse();
	}

	@ParameterizedTest
	@EnumSource(value = Perfil.class, names = "PARTICIPANTE", mode = EnumSource.Mode.EXCLUDE)
	void emailDeUsuarioDaEquipeGeraConflito(Perfil perfil) {
		Candidato candidato = candidato("carlos@teste.com");
		when(usuarios.findByEmailIgnoreCase("carlos@teste.com"))
				.thenReturn(Optional.of(new Usuario("Carlos", "carlos@teste.com", null, perfil, "hash")));

		assertThatThrownBy(() -> servico.vincularOuCriar(candidato))
				.isInstanceOfSatisfying(RegraNegocioException.class, ex -> {
					assertThat(ex.getCodigo()).isEqualTo("EMAIL_DE_OUTRO_PERFIL");
					assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
				});
		assertThat(candidato.getUsuario()).isNull();
		verify(usuarios, never()).save(any());
	}

	// ---- Consulta

	@Test
	void consultaNaoDevolveSenha() {
		Usuario conta = comId(new Usuario("João", "joao@teste.com", null, Perfil.PARTICIPANTE, "hash"), 7L);
		Candidato candidato = candidato("joao@teste.com");
		candidato.vincularConta(conta);
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));

		assertThat(servico.consultar(5L))
				.isEqualTo(new ContaParticipanteResponse(7L, "joao@teste.com", true, true, null));
	}

	@Test
	void candidatoSemContaLancaNaoEncontrado() {
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato("joao@teste.com")));

		assertThatThrownBy(() -> servico.consultar(5L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Este candidato ainda não tem conta de participante");
	}

	@Test
	void candidatoInexistenteLancaNaoEncontrado() {
		when(candidatos.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> servico.redefinirSenha(99L))
				.isInstanceOf(RecursoNaoEncontradoException.class)
				.hasMessage("Candidato não encontrado");
	}

	// ---- Nova senha provisória

	@Test
	void redefinirSenhaTrocaOHashEDevolveANovaSenhaUmaVez() {
		Usuario conta = comId(new Usuario("João", "joao@teste.com", null, Perfil.PARTICIPANTE, "hash-antigo"), 7L);
		Candidato candidato = candidato("joao@teste.com");
		candidato.vincularConta(conta);
		when(candidatos.findById(5L)).thenReturn(Optional.of(candidato));
		when(geradorSenha.gerar()).thenReturn("Nn4pQr7sTu");
		when(codificadorSenha.encode("Nn4pQr7sTu")).thenReturn("hash-novo");

		ContaParticipanteResponse resposta = servico.redefinirSenha(5L);

		assertThat(conta.getSenhaHash()).isEqualTo("hash-novo");
		assertThat(resposta.senhaProvisoria()).isEqualTo("Nn4pQr7sTu");
		assertThat(resposta.contaExistente()).isTrue();
	}

	private static Candidato candidato(String email) {
		Estudo estudo = new Estudo("Estudo", "Objetivo",
				new Usuario("Ana", "ana@teste.com", null, Perfil.PESQUISADOR, "hash"), LocalDate.of(2026, 11, 1), null, 30);
		Candidato candidato = new Candidato(estudo, "João Silva", email, null, LocalDate.of(1990, 5, 20));
		ReflectionTestUtils.setField(candidato, "id", 5L);
		return candidato;
	}

	private static Usuario comId(Usuario usuario, Long id) {
		ReflectionTestUtils.setField(usuario, "id", id);
		return usuario;
	}

}
