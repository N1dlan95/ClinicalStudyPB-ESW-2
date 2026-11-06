package clinicalstudypb.candidato.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.StatusCandidato;

public record CandidatoResponse(
		Long id,
		Long estudoId,
		String nome,
		String email,
		String telefone,
		LocalDate dataNascimento,
		StatusCandidato status,
		Consentimento consentimento,
		LocalDate dataInclusao) {

	// Nulo enquanto o consentimento não for registrado
	public record Consentimento(LocalDateTime registradoEm, String registradoPor) {
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
				candidato.getDataInclusao());
	}

	private static Consentimento consentimentoDe(Candidato candidato) {
		if (!candidato.isConsentimentoRegistrado()) {
			return null;
		}
		return new Consentimento(candidato.getConsentimentoRegistradoEm(),
				candidato.getConsentimentoRegistradoPor().getNome());
	}

}
