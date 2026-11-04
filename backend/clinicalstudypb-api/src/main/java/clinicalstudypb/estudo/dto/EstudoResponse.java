package clinicalstudypb.estudo.dto;

import java.time.LocalDate;

import clinicalstudypb.estudo.EstadoEstudo;
import clinicalstudypb.estudo.Estudo;
import clinicalstudypb.usuario.Usuario;

public record EstudoResponse(
		Long id,
		String titulo,
		String objetivo,
		ResponsavelResumo responsavel,
		LocalDate dataInicio,
		LocalDate dataFim,
		int limiteParticipantes,
		EstadoEstudo estado) {

	public record ResponsavelResumo(Long id, String nome) {

		static ResponsavelResumo de(Usuario usuario) {
			return new ResponsavelResumo(usuario.getId(), usuario.getNome());
		}

	}

	public static EstudoResponse de(Estudo estudo) {
		return new EstudoResponse(
				estudo.getId(),
				estudo.getTitulo(),
				estudo.getObjetivo(),
				ResponsavelResumo.de(estudo.getResponsavel()),
				estudo.getDataInicio(),
				estudo.getDataFim(),
				estudo.getLimiteParticipantes(),
				estudo.getEstado());
	}

}
