package clinicalstudypb.estudo;

// RF07: estados do estudo. A mudança de estado entra em uma próxima sprint; por enquanto o estudo nasce em PLANEJAMENTO.
public enum EstadoEstudo {
	PLANEJAMENTO,
	RECRUTAMENTO,
	EXECUCAO,
	ENCERRADO
}
