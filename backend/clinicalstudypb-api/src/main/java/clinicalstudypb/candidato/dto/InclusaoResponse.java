package clinicalstudypb.candidato.dto;

import clinicalstudypb.conta.dto.ContaParticipanteResponse;

// RF11: vagas ocupadas e total do estudo depois da inclusão.
// conta (task 3751): acesso do participante ao app, com a senha provisória quando a conta foi criada agora.
public record InclusaoResponse(long vagasOcupadas, int limiteParticipantes, ContaParticipanteResponse conta) {
}
