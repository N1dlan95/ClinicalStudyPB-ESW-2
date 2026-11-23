package clinicalstudypb.candidato.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.usuario.Usuario;

public record CandidatoResponse(
		Long id,
		Long estudoId,
		String nome,
		String email,
		String telefone,
		LocalDate dataNascimento,
		StatusCandidato status,
		Consentimento consentimento,
		LocalDate dataInclusao,
		// Task 3751: verdadeiro quando o participante já tem conta de acesso ao app
		boolean possuiConta,
		Retirada retirada) {

	// Nulo enquanto o consentimento não for registrado
	public record Consentimento(LocalDateTime registradoEm, String registradoPor) {
	}

	// RF16 (task 3768): nula enquanto o participante não for retirado. registradaPor fica nulo nas
	// retiradas do seed, anteriores ao RF16
	public record Retirada(LocalDateTime registradaEm, String registradaPor, String motivo) {
	}

	public static CandidatoResponse de(Candidato candidato) {
		return new CandidatoResponse(
				candidato.getId(),
				candidato.getEstudo().getId(),
				candidato.getNome(),
				candidato.getEmail(),
				candidato.getTelefone(),
				candidato.getDataNascimento(),
				candidato.getStatus(),
				consentimentoDe(candidato),
				candidato.getDataInclusao(),
				candidato.possuiConta(),
				retiradaDe(candidato));
	}

	private static Retirada retiradaDe(Candidato candidato) {
		if (!candidato.isRetiradaRegistrada()) {
			return null;
		}
		Usuario responsavel = candidato.getRetiradaRegistradaPor();
		return new Retirada(candidato.getRetiradaRegistradaEm(), responsavel == null ? null : responsavel.getNome(),
				candidato.getMotivoRetirada());
	}

	private static Consentimento consentimentoDe(Candidato candidato) {
		if (!candidato.isConsentimentoRegistrado()) {
			return null;
		}
		return new Consentimento(candidato.getConsentimentoRegistradoEm(),
				candidato.getConsentimentoRegistradoPor().getNome());
	}

}
