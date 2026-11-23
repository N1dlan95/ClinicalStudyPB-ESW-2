package clinicalstudypb.participante.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.estudo.EstadoEstudo;

// RF17: uma participação do usuário logado (schema EstudoDoParticipante do openapi.yaml)
public record EstudoDoParticipanteResponse(
		Long id,
		String titulo,
		String responsavel,
		EstadoEstudo estado,
		LocalDate dataInicio,
		LocalDate dataFim,
		Long candidatoId,
		StatusCandidato participacao,
		LocalDate dataInclusao,
		LocalDateTime retiradaEm,
		ProximaVisita proximaVisita) {

	// Próxima visita AGENDADA desta participação; nula quando não há nenhuma
	public record ProximaVisita(Long id, String nome, LocalDateTime dataHora) {
	}

}
