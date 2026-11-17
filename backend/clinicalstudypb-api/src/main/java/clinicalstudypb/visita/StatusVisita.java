package clinicalstudypb.visita;

// RF13: situação da visita. AGENDADA é o estado inicial; os outros três são finais.
public enum StatusVisita {
	AGENDADA,
	REALIZADA,
	AUSENTE,
	CANCELADA;

	public boolean isFinal() {
		return this != AGENDADA;
	}
}
