import '../../estilos/estudos.css'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { brParaIso, isoParaBR, mascaraData } from './datas'
import {
  atualizarEstudo,
  buscarEstudo,
  criarEstudo,
  listarPesquisadores,
} from './estudosService'
import {
  ROTULO_STATUS,
  type CampoEstudo,
  type Estudo,
  type ErrosEstudo,
  type FormularioEstudo,
  type Pesquisador,
  type StatusEstudo,
} from './tipos'
import { ORDEM_CAMPOS, ROTULO_CAMPO, validarEstudo } from './validacao'

const FORMULARIO_VAZIO: FormularioEstudo = {
  titulo: '',
  codigoProtocolo: '',
  descricao: '',
  pesquisadorId: '',
  status: 'planejado',
  dataInicio: '',
  dataTermino: '',
  limiteParticipantes: '',
}

function Campo({
  rotulo,
  obrigatorio,
  erro,
  dica,
  children,
}: {
  rotulo: string
  obrigatorio?: boolean
  erro?: string
  dica?: string
  children: ReactNode
}) {
  return (
    <label className="pn-campo">
      <span className="pn-campo__rotulo">
        {rotulo}
        {obrigatorio && ' *'}
      </span>
      {children}
      {erro ? (
        <span className="pn-campo__erro">{erro}</span>
      ) : (
        dica && <span className="pn-campo__dica">{dica}</span>
      )}
    </label>
  )
}

function OcupacaoAtual({ incluidos, limite }: { incluidos: number; limite: number }) {
  const acima = Math.max(0, incluidos - limite)
  const percentual = limite > 0 ? Math.min(100, Math.round((incluidos / limite) * 100)) : 100
  return (
    <div className="pn-campo">
      <span className="pn-campo__rotulo">Ocupação atual</span>
      <div className="ocupacao__linha">
        <span>{incluidos} incluídos</span>
        {acima > 0 && <span className="pn-campo__erro">{acima} acima do novo limite</span>}
      </div>
      <div className="barra">
        <div
          className={acima > 0 ? 'barra__preenchida barra__preenchida--lotado' : 'barra__preenchida'}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}

export function EstudoFormPage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const edicao = Boolean(id)

  const [form, setForm] = useState<FormularioEstudo>(FORMULARIO_VAZIO)
  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([])
  const [erros, setErros] = useState<ErrosEstudo>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const incluidos = estudo?.participantesIncluidos ?? 0

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const lista = await listarPesquisadores()
        if (!ativo) return
        setPesquisadores(lista)

        if (id) {
          const existente = await buscarEstudo(id)
          if (!ativo) return
          setEstudo(existente)
          setForm({
            titulo: existente.titulo,
            codigoProtocolo: existente.codigoProtocolo,
            descricao: existente.descricao,
            pesquisadorId: existente.pesquisadorId,
            status: existente.status,
            dataInicio: isoParaBR(existente.dataInicio),
            dataTermino: isoParaBR(existente.dataTermino),
            limiteParticipantes: String(existente.limiteParticipantes),
          })
        }
      } catch {
        if (ativo) setMensagemErro('Não foi possível carregar os dados. Tente novamente.')
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [id])

  function alterar<C extends CampoEstudo>(campo: C, valor: FormularioEstudo[C]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    // some com o erro do campo assim que a pessoa volta a digitar nele
    setErros((atuais) => {
      if (!atuais[campo]) return atuais
      const proximos = { ...atuais }
      delete proximos[campo]
      return proximos
    })
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')

    const encontrados = validarEstudo(form, incluidos)
    setErros(encontrados)
    const camposComErro = ORDEM_CAMPOS.filter((c) => encontrados[c])
    if (camposComErro.length > 0) {
      if (camposComErro.length === 1) {
        setMensagemErro(
          camposComErro[0] === 'limiteParticipantes' && edicao
            ? 'Não foi possível salvar as alterações. Revise o limite de participantes.'
            : `Corrija o campo destacado para ${edicao ? 'salvar' : 'cadastrar'} o estudo.`,
        )
      }
      return
    }

    const dados = {
      titulo: form.titulo.trim(),
      codigoProtocolo: form.codigoProtocolo.trim(),
      descricao: form.descricao.trim(),
      pesquisadorId: form.pesquisadorId,
      status: form.status,
      dataInicio: brParaIso(form.dataInicio) ?? '',
      dataTermino: brParaIso(form.dataTermino) ?? '',
      limiteParticipantes: Number(form.limiteParticipantes),
    }

    setSalvando(true)
    try {
      if (id) await atualizarEstudo(id, dados)
      else await criarEstudo(dados)
      navegar('/estudos')
    } catch {
      setMensagemErro(
        edicao
          ? 'Não foi possível salvar as alterações. Tente novamente.'
          : 'Não foi possível cadastrar o estudo. Tente novamente.',
      )
    } finally {
      setSalvando(false)
    }
  }

  const camposComErro = ORDEM_CAMPOS.filter((c) => erros[c])
  const limiteDigitado = Number(form.limiteParticipantes)
  const limiteValido = Number.isInteger(limiteDigitado) && limiteDigitado > 0
  const lotado = edicao && estudo !== null && estudo.participantesIncluidos >= estudo.limiteParticipantes

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando…</p>
      </div>
    )
  }

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {edicao ? (estudo?.titulo ?? 'Editar') : 'Novo estudo'}
      </nav>
      <div className="titulo-com-selo">
        <h1>{edicao ? 'Editar estudo' : 'Novo estudo'}</h1>
        {estudo && <span className={`selo selo--${estudo.status}`}>{ROTULO_STATUS[estudo.status]}</span>}
      </div>

      {edicao && estudo && (
        <div className="indicadores">
          <div className="cartao indicador">
            <small>Participantes incluídos</small>
            <strong>
              {estudo.participantesIncluidos} de {estudo.limiteParticipantes}
            </strong>
          </div>
          <div className="cartao indicador">
            <small>Próxima visita</small>
            <strong>{estudo.proximaVisita ? isoParaBR(estudo.proximaVisita) : '—'}</strong>
          </div>
          <div className="cartao indicador">
            <small>Pedidos de retirada</small>
            <strong>{estudo.pedidosRetirada}</strong>
          </div>
        </div>
      )}

      {camposComErro.length > 1 && (
        <div className="aviso aviso--erro" role="alert">
          <strong>
            Corrija {camposComErro.length} campos para {edicao ? 'salvar' : 'cadastrar'} o estudo:
          </strong>
          <ul>
            {camposComErro.map((campo) => (
              <li key={campo}>{ROTULO_CAMPO[campo]}</li>
            ))}
          </ul>
        </div>
      )}
      {mensagemErro && (
        <div className="aviso aviso--erro" role="alert">
          {mensagemErro}
        </div>
      )}
      {lotado && (
        <div className="aviso aviso--atencao">
          Limite de participantes atingido. Para incluir mais pessoas, aumente o limite na edição
          do estudo.
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <section>
          <h2>Identificação</h2>
          <div className="formulario__grade">
            <Campo rotulo="Título do estudo" obrigatorio erro={erros.titulo}>
              <input
                className={erros.titulo ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'}
                placeholder="Ex.: Estudo de exemplo C"
                value={form.titulo}
                onChange={(e) => alterar('titulo', e.target.value)}
              />
            </Campo>
            <Campo rotulo="Código do protocolo" obrigatorio erro={erros.codigoProtocolo}>
              <input
                className={
                  erros.codigoProtocolo ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                }
                placeholder="Ex.: [CÓDIGO-C]"
                value={form.codigoProtocolo}
                onChange={(e) => alterar('codigoProtocolo', e.target.value)}
              />
            </Campo>
          </div>
          <Campo
            rotulo="Descrição"
            dica="Opcional. Um resumo curto aparece para o participante no aplicativo."
          >
            <textarea
              className="pn-campo__entrada"
              rows={3}
              placeholder="Objetivo do estudo e informações para a equipe"
              value={form.descricao}
              onChange={(e) => alterar('descricao', e.target.value)}
            />
          </Campo>
        </section>

        <section>
          <h2>Responsável e status</h2>
          <div className="formulario__grade">
            <Campo
              rotulo="Pesquisador responsável"
              obrigatorio
              erro={erros.pesquisadorId}
              dica="Lista apenas usuários ativos com perfil Pesquisador."
            >
              <select
                className={
                  erros.pesquisadorId ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                }
                value={form.pesquisadorId}
                onChange={(e) => alterar('pesquisadorId', e.target.value)}
              >
                <option value="">Selecione</option>
                {pesquisadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              rotulo="Status"
              obrigatorio
              dica={
                edicao ? 'Ao encerrar, o estudo aparece como “Encerrado” no aplicativo.' : undefined
              }
            >
              <select
                className="pn-campo__entrada"
                value={form.status}
                onChange={(e) => alterar('status', e.target.value as StatusEstudo)}
              >
                {(Object.keys(ROTULO_STATUS) as StatusEstudo[]).map((status) => (
                  <option key={status} value={status}>
                    {ROTULO_STATUS[status]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </section>

        <section>
          <h2>Período e vagas</h2>
          <div className="formulario__grade">
            <Campo rotulo="Data de início" obrigatorio erro={erros.dataInicio}>
              <input
                className={erros.dataInicio ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                value={form.dataInicio}
                onChange={(e) => alterar('dataInicio', mascaraData(e.target.value))}
              />
            </Campo>
            <Campo rotulo="Data de término prevista" obrigatorio erro={erros.dataTermino}>
              <input
                className={erros.dataTermino ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                value={form.dataTermino}
                onChange={(e) => alterar('dataTermino', mascaraData(e.target.value))}
              />
            </Campo>
            <Campo
              rotulo="Limite de participantes"
              obrigatorio
              erro={erros.limiteParticipantes}
              dica={
                edicao
                  ? `Não pode ser menor que os ${incluidos} já incluídos.`
                  : 'Ao atingir o limite, novas inclusões ficam bloqueadas.'
              }
            >
              <input
                className={
                  erros.limiteParticipantes ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                }
                placeholder="Ex.: 30"
                inputMode="numeric"
                value={form.limiteParticipantes}
                onChange={(e) => alterar('limiteParticipantes', e.target.value.replace(/\D/g, ''))}
              />
            </Campo>
            {edicao && limiteValido && <OcupacaoAtual incluidos={incluidos} limite={limiteDigitado} />}
          </div>
        </section>

        <footer className="formulario__rodape">
          <small>
            {edicao && estudo?.ultimaAlteracaoEm
              ? `Última alteração em ${isoParaBR(estudo.ultimaAlteracaoEm)}${
                  estudo.ultimaAlteracaoPor ? ` por ${estudo.ultimaAlteracaoPor}` : ''
                }`
              : '* Campos obrigatórios'}
          </small>
          <div className="formulario__acoes">
            <button
              type="button"
              className="botao botao--contorno"
              onClick={() => navegar('/estudos')}
            >
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={salvando}>
              {salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar estudo'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
