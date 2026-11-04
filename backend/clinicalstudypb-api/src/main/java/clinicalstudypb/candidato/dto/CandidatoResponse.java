package clinicalstudypb.candidato.dto;

import java.time.LocalDate;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.candidato.StatusCandidato;

public record CandidatoResponse(
		Long id,
		Long estudoId,
		String nome,
		String email,
		String telefone,
		LocalDate dataNascimento,
		StatusCandidato status) {

	public static CandidatoResponse de(Candidato candidato) {
		return new CandidatoResponse(
				candidato.getId(),
				candidato.getEstudo().getId(),
				candidato.getNome(),
				candidato.getEmail(),
				candidato.getTelefone(),
				candidato.getDataNascimento(),
				candidato.getStatus());
	}

}
