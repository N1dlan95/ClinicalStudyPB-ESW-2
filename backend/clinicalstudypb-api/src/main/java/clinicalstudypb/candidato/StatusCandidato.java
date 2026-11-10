package clinicalstudypb.candidato;

// Estados do candidato (MER-v1.md, seção 4.2). Todo candidato nasce CADASTRADO;
// a avaliação de elegibilidade (RF09), a inclusão (RF11) e a retirada (RF16) mudam o status.
public enum StatusCandidato {
	CADASTRADO,
	ELEGIVEL,
	INELEGIVEL,
	INCLUIDO,
	RETIRADO
}
