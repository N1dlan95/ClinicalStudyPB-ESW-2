package clinicalstudypb.visita.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import clinicalstudypb.candidato.Candidato;
import clinicalstudypb.usuario.Usuario;
import clinicalstudypb.visita.JanelaVisita;
import clinicalstudypb.visita.StatusVisita;
import clinicalstudypb.visita.Visita;
import clinicalstudypb.visitaprevista.VisitaPrevista;

// RF12/RF13: visita do participante no formato usado pela agenda web e pelo app
public record VisitaResponse(
		Long id,
		Long estudoId,
		Participante participante,
		VisitaPrevistaResumo visitaPrevista,
		LocalDateTime dataHora,
		String local,
		StatusVisita status,
		String observacao,
		Janela janela,
		String agendadaPor,
		LocalDateTime statusRegistradoEm,
		String statusRegistradoPor) {

	public record Participante(Long candidatoId, String nome) {
	}

	public record VisitaPrevistaResumo(Long id, int ordem, String nome) {
	}

	// Datas em que a visita pode acontecer, calculadas a partir da inclusão (D0 + dia previsto ± janela)
	public record Janela(LocalDate inicio, LocalDate fim) {
	}

	public static VisitaResponse de(Visita visita) {
		Candidato participante = visita.getParticipante();
		VisitaPrevista prevista = visita.getVisitaPrevista();
		JanelaVisita janela = JanelaVisita.de(participante, prevista);
		return new VisitaResponse(
				visita.getId(),
				participante.getEstudo().getId(),
				new Participante(participante.getId(), participante.getNome()),
				new VisitaPrevistaResumo(prevista.getId(), prevista.getOrdem(), prevista.getNome()),
				visita.getDataHora(),
				visita.getLocal(),
				visita.getStatus(),
				visita.getObservacao(),
				janela == null ? null : new Janela(janela.inicio(), janela.fim()),
				nome(visita.getAgendadaPor()),
				visita.getStatusRegistradoEm(),
				nome(visita.getStatusRegistradoPor()));
	}

	private static String nome(Usuario usuario) {
		return usuario == null ? null : usuario.getNome();
	}

}
