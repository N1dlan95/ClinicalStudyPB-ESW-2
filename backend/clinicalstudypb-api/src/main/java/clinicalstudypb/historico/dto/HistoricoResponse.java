package clinicalstudypb.historico.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import clinicalstudypb.candidato.StatusCandidato;
import clinicalstudypb.candidato.dto.CandidatoResponse;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.dto.ResultadosResponse;
import clinicalstudypb.visita.dto.VisitaResponse;

// RF15 (task 3765): a participação e todas as visitas do participante, da mais antiga para a mais recente,
// cada uma com os resultados registrados
public record HistoricoResponse(Participante participante, EstudoResumo estudo, List<VisitaHistorico> visitas) {

	// retirada fica nula enquanto o participante não for retirado
	public record Participante(
			Long candidatoId,
			String nome,
			String email,
			StatusCandidato status,
			LocalDate dataInclusao,
			CandidatoResponse.Retirada retirada) {
	}

	public record EstudoResumo(Long id, String titulo) {
	}

	// observacao traz o motivo do cancelamento ou a anotação do registro. resultados tem só as atividades
	// com resultado registrado, na ordem do protocolo (vazio se a visita não foi realizada)
	public record VisitaHistorico(
			Long id,
			VisitaResponse.VisitaPrevistaResumo visitaPrevista,
			LocalDateTime dataHora,
			String local,
			StatusVisita status,
			String observacao,
			List<ResultadosResponse.Item> resultados) {
	}

}
