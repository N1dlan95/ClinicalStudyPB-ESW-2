package clinicalstudypb.candidato.dto;

// RF16: o participante atualizado, quantas visitas agendadas foram canceladas e as vagas depois da retirada
public record RetiradaResponse(CandidatoResponse candidato, int visitasCanceladas, long vagasOcupadas,
		int limiteParticipantes) {
}
