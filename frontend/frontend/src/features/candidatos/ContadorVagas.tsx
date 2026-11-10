// Contador "X de N vagas" com barra (task 3566)
export function ContadorVagas({ ocupadas, limite }: { ocupadas: number | null; limite: number }) {
  const conhecido = ocupadas !== null
  const lotado = conhecido && ocupadas >= limite
  const percentual = conhecido && limite > 0 ? Math.min(100, Math.round((ocupadas / limite) * 100)) : 0
  return (
    <div className="cartao contador-vagas" aria-label="Vagas do estudo">
      <small>Vagas do estudo</small>
      <div className="contador-vagas__linha">
        <strong className={lotado ? 'contador-vagas__numero--lotado' : undefined}>
          {conhecido ? `${ocupadas} de ${limite} vagas` : `${limite} vagas`}
        </strong>
        {conhecido && (
          <span className={lotado ? 'contador-vagas__resto--lotado' : 'contador-vagas__resto'}>
            {lotado ? 'esgotadas' : `${limite - ocupadas} ${limite - ocupadas === 1 ? 'livre' : 'livres'}`}
          </span>
        )}
      </div>
      <div
        className="barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={ocupadas ?? 0}
      >
        <div
          className={lotado ? 'barra__preenchida barra__preenchida--lotado' : 'barra__preenchida'}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}
