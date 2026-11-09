import '../../estilos/estudos.css'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AbasEstudo } from './AbasEstudo'
import {
  atualizarVisitaPrevista,
  buscarEstudo,
  criarVisitaPrevista,
  excluirVisitaPrevista,
  listarVisitasPrevistas,
  traduzirErro,
} from './estudosService'
import { ROTULO_ESTADO, type Estudo, type VisitaPrevista } from './tipos'

// ---------- Prévia de calendário (somente na tela, não é salva na API) ----------
// A visita prevista é um modelo do protocolo: o dia é relativo à inclusão (D0).
// Para facilitar a leitura, a tela converte o dia relativo em data e hora a partir
// de uma data de referência escolhida pelo usuário.
// Pendência registrada em Docs/ClinicalStudyPB-Docs/Sprints/pendencia-visitas-data-hora.md

// Soma dias a uma data ISO (aaaa-mm-dd) usando UTC, para não sofrer com fuso/horário de verão
function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return data.toISOString().slice(0, 10)
}

function formatarBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function descreverDataPrevista(
  referencia: string,
  horario: string,
  diaPrevisto: number,
  janelaDias: number | null,
): { data: string; janela: string | null } | null {
  if (!referencia || !Number.isInteger(diaPrevisto) || diaPrevisto < 0) return null
  const data = `${formatarBR(somarDias(referencia, diaPrevisto))}${horario ? ` às ${horario}` : ''}`
  const janela =
    janelaDias && janelaDias > 0
      ? `${formatarBR(somarDias(referencia, Math.max(0, diaPrevisto - janelaDias)))} a ${formatarBR(
          somarDias(referencia, diaPrevisto + janelaDias),
        )}`
      : null
  return { data, janela }
}

interface AtividadeForm {
  ordem: string
  descricao: string
}

interface ErrosVisita {
  nome?: string
  ordem?: string
  diaPrevisto?: string
  janelaDias?: string
  atividades?: string
}

function validarVisita(
  nome: string,
  ordem: string,
  diaPrevisto: string,
  janelaDias: string,
  atividades: AtividadeForm[],
): ErrosVisita {
  const erros: ErrosVisita = {}
  const nomeLimpo = nome.trim()
  if (!nomeLimpo) {
    erros.nome = 'Informe o nome da visita.'
  } else if (nomeLimpo.length < 3) {
    erros.nome = 'O nome deve ter entre 3 e 120 caracteres.'
  }

  const numOrdem = Number(ordem)
  if (!ordem.trim() || !Number.isInteger(numOrdem) || numOrdem <= 0) {
    erros.ordem = 'A ordem deve ser maior que zero.'
  }

  const numDia = Number(diaPrevisto)
  if (diaPrevisto.trim() === '' || !Number.isInteger(numDia) || numDia < 0) {
    erros.diaPrevisto = 'O dia previsto deve ser um número maior ou igual a zero.'
  }

  if (janelaDias.trim() !== '') {
    const numJanela = Number(janelaDias)
    if (!Number.isInteger(numJanela) || numJanela < 0) {
      erros.janelaDias = 'A janela de dias não pode ser negativa.'
    }
  }

  const ordensAtividades = new Set<number>()
  for (const a of atividades) {
    const ord = Number(a.ordem)
    if (!a.ordem.trim() || !Number.isInteger(ord) || ord <= 0) {
      erros.atividades = 'A ordem das atividades deve ser maior que zero.'
      break
    }
    if (ordensAtividades.has(ord)) {
      erros.atividades = 'A ordem das atividades não pode se repetir na visita.'
      break
    }
    ordensAtividades.add(ord)
    if (!a.descricao.trim()) {
      erros.atividades = 'A descrição de todas as atividades é obrigatória.'
      break
    }
  }

  return erros
}

export function VisitasPrevistasPage() {
  const { id } = useParams<{ id: string }>()
  const estudoId = Number(id)

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [visitas, setVisitas] = useState<VisitaPrevista[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [ordem, setOrdem] = useState('1')
  const [nome, setNome] = useState('')
  const [diaPrevisto, setDiaPrevisto] = useState('0')
  const [janelaDias, setJanelaDias] = useState('')
  const [descricao, setDescricao] = useState('')
  const [atividades, setAtividades] = useState<AtividadeForm[]>([{ ordem: '1', descricao: '' }])

  const [erros, setErros] = useState<ErrosVisita>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Prévia de calendário: data de referência (D0) e horário sugerido
  const [dataReferencia, setDataReferencia] = useState('')
  const [horario, setHorario] = useState('08:00')

  const encerrado = estudo?.estado === 'ENCERRADO'

  useEffect(() => {
    let ativo = true
    Promise.all([buscarEstudo(estudoId), listarVisitasPrevistas(estudoId)])
      .then(([dadosEstudo, lista]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setVisitas(lista)
        setOrdem(String(lista.length + 1))
        // Por padrão, a prévia usa a data de início do estudo como D0
        setDataReferencia(dadosEstudo.dataInicio)
      })
      .catch((erro) => {
        if (ativo) {
          setMensagemErro(
            `Não foi possível carregar as visitas previstas. ${traduzirErro(erro).message}`,
          )
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId])

  function limparFormulario(proximaOrdem = visitas.length + 1) {
    setEditandoId(null)
    setOrdem(String(proximaOrdem))
    setNome('')
    setDiaPrevisto('0')
    setJanelaDias('')
    setDescricao('')
    setAtividades([{ ordem: '1', descricao: '' }])
    setErros({})
  }

  function iniciarEdicao(visita: VisitaPrevista) {
    setEditandoId(visita.id)
    setOrdem(String(visita.ordem))
    setNome(visita.nome)
    setDiaPrevisto(String(visita.diaPrevisto))
    setJanelaDias(visita.janelaDias !== null ? String(visita.janelaDias) : '')
    setDescricao(visita.descricao ?? '')
    setAtividades(
      visita.atividades.length > 0
        ? visita.atividades.map((a) => ({ ordem: String(a.ordem), descricao: a.descricao }))
        : [],
    )
    setErros({})
    setMensagemErro('')
    setSucesso('')
  }

  function adicionarAtividade() {
    setAtividades((atuais) => [
      ...atuais,
      { ordem: String(atuais.length + 1), descricao: '' },
    ])
    setErros((atuais) => ({ ...atuais, atividades: undefined }))
  }

  function removerAtividade(indice: number) {
    setAtividades((atuais) => atuais.filter((_, i) => i !== indice))
    setErros((atuais) => ({ ...atuais, atividades: undefined }))
  }

  function alterarAtividade(indice: number, campo: keyof AtividadeForm, valor: string) {
    setAtividades((atuais) =>
      atuais.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    )
    setErros((atuais) => ({ ...atuais, atividades: undefined }))
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')
    setSucesso('')

    const encontrados = validarVisita(nome, ordem, diaPrevisto, janelaDias, atividades)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const dados = {
      ordem: Number(ordem),
      nome: nome.trim(),
      diaPrevisto: Number(diaPrevisto),
      janelaDias: janelaDias.trim() ? Number(janelaDias) : null,
      descricao: descricao.trim() ? descricao.trim() : null,
      atividades: atividades.map((a) => ({
        ordem: Number(a.ordem),
        descricao: a.descricao.trim(),
      })),
    }

    setSalvando(true)
    try {
      if (editandoId !== null) {
        await atualizarVisitaPrevista(estudoId, editandoId, dados)
        setSucesso('Visita prevista atualizada com sucesso.')
      } else {
        await criarVisitaPrevista(estudoId, dados)
        setSucesso('Visita prevista cadastrada com sucesso.')
      }
      const atualizadas = await listarVisitasPrevistas(estudoId)
      setVisitas(atualizadas)
      limparFormulario(atualizadas.length + 1)
    } catch (erro) {
      setMensagemErro(`Não foi possível salvar a visita prevista. ${traduzirErro(erro).message}`)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao(visita: VisitaPrevista) {
    setMensagemErro('')
    setSucesso('')
    try {
      await excluirVisitaPrevista(estudoId, visita.id)
      const restantes = visitas.filter((v) => v.id !== visita.id)
      setVisitas(restantes)
      if (editandoId === visita.id) limparFormulario(restantes.length + 1)
      setSucesso('Visita prevista excluída com sucesso.')
    } catch (erro) {
      setMensagemErro(`Não foi possível excluir a visita prevista. ${traduzirErro(erro).message}`)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando visitas previstas…</p>
      </div>
    )
  }

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Visitas previstas
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="visitas" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Visitas previstas e atividades</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Cronograma de visitas do protocolo a partir da inclusão e atividades previstas em cada visita.
          </p>
        </div>
      </div>

      {encerrado && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Estudo encerrado.</strong> Não é possível alterar visitas previstas de um estudo encerrado.
        </div>
      )}

      {mensagemErro && (
        <div className="aviso aviso--erro" role="alert">
          {mensagemErro}
        </div>
      )}
      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      <section className="cartao calendario-previa" aria-labelledby="titulo-calendario-previa">
        <div>
          <h2 id="titulo-calendario-previa">Prévia de calendário</h2>
          <p className="cartao__texto">
            As visitas são definidas em dias após a inclusão (D0). Escolha uma data de referência e um horário
            para ver as datas previstas. <strong>Esses dois campos não são salvos</strong>: cada participante
            terá o próprio calendário a partir da data em que for incluído.
          </p>
        </div>
        <div className="calendario-previa__campos">
          <label className="pn-campo">
            <span className="pn-campo__rotulo">Data de referência (D0)</span>
            <input
              type="date"
              className="pn-campo__entrada"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
            />
          </label>
          <label className="pn-campo">
            <span className="pn-campo__rotulo">Horário sugerido</span>
            <input
              type="time"
              className="pn-campo__entrada"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </label>
        </div>
      </section>

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={encerrado || salvando}>
          <section>
            <h2>{editandoId !== null ? 'Editar visita prevista' : 'Nova visita prevista'}</h2>
            <div className="formulario__grade">
              <label className="pn-campo">
                <span className="pn-campo__rotulo">Nome da visita *</span>
                <input
                  className={
                    erros.nome ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                  }
                  placeholder="Ex.: Visita de triagem"
                  maxLength={120}
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    setErros((atuais) => ({ ...atuais, nome: undefined }))
                  }}
                />
                {erros.nome && <span className="pn-campo__erro">{erros.nome}</span>}
              </label>

              <label className="pn-campo">
                <span className="pn-campo__rotulo">Ordem da visita *</span>
                <input
                  className={
                    erros.ordem ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                  }
                  placeholder="Ex.: 1"
                  inputMode="numeric"
                  value={ordem}
                  onChange={(e) => {
                    setOrdem(e.target.value)
                    setErros((atuais) => ({ ...atuais, ordem: undefined }))
                  }}
                />
                {erros.ordem && <span className="pn-campo__erro">{erros.ordem}</span>}
              </label>

              <label className="pn-campo">
                <span className="pn-campo__rotulo">Dia previsto (após inclusão) *</span>
                <input
                  className={
                    erros.diaPrevisto
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  placeholder="Ex.: 0"
                  inputMode="numeric"
                  value={diaPrevisto}
                  onChange={(e) => {
                    setDiaPrevisto(e.target.value)
                    setErros((atuais) => ({ ...atuais, diaPrevisto: undefined }))
                  }}
                />
                {erros.diaPrevisto ? (
                  <span className="pn-campo__erro">{erros.diaPrevisto}</span>
                ) : (
                  <span className="pn-campo__dica">Dias contados a partir da data de inclusão (D0).</span>
                )}
              </label>

              <label className="pn-campo">
                <span className="pn-campo__rotulo">Janela de tolerância (dias)</span>
                <input
                  className={
                    erros.janelaDias
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  placeholder="Opcional. Ex.: 2"
                  inputMode="numeric"
                  value={janelaDias}
                  onChange={(e) => {
                    setJanelaDias(e.target.value)
                    setErros((atuais) => ({ ...atuais, janelaDias: undefined }))
                  }}
                />
                {erros.janelaDias ? (
                  <span className="pn-campo__erro">{erros.janelaDias}</span>
                ) : (
                  <span className="pn-campo__dica">Tolerância para mais ou para menos em relação ao dia previsto.</span>
                )}
              </label>
            </div>

            <label className="pn-campo" style={{ marginTop: '8px' }}>
              <span className="pn-campo__rotulo">Descrição da visita</span>
              <input
                className="pn-campo__entrada"
                placeholder="Opcional. Orientações gerais sobre esta visita"
                maxLength={500}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </label>

            {(() => {
              const previa = descreverDataPrevista(
                dataReferencia,
                horario,
                diaPrevisto.trim() === '' ? NaN : Number(diaPrevisto),
                janelaDias.trim() === '' ? null : Number(janelaDias),
              )
              if (!previa) return null
              return (
                <p className="previa-data" role="note">
                  Data prevista (prévia): <strong>{previa.data}</strong>
                  {previa.janela && <> · janela de {previa.janela}</>}
                </p>
              )
            })()}
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>Atividades previstas na visita</h2>
              <button
                type="button"
                className="botao botao--contorno botao--pequeno"
                onClick={adicionarAtividade}
              >
                + Adicionar atividade
              </button>
            </div>

            {erros.atividades && (
              <p className="pn-campo__erro" role="alert" style={{ marginBottom: '8px' }}>
                {erros.atividades}
              </p>
            )}

            {atividades.map((atividade, indice) => (
              <div key={indice} className="linha-atividade-form">
                <label className="pn-campo">
                  <span className="pn-campo__rotulo">Ordem *</span>
                  <input
                    className="pn-campo__entrada"
                    aria-label={`Ordem da atividade ${indice + 1}`}
                    inputMode="numeric"
                    value={atividade.ordem}
                    onChange={(e) => alterarAtividade(indice, 'ordem', e.target.value)}
                  />
                </label>

                <label className="pn-campo">
                  <span className="pn-campo__rotulo">Descrição da atividade *</span>
                  <input
                    className="pn-campo__entrada"
                    aria-label={`Descrição da atividade ${indice + 1}`}
                    placeholder="Ex.: Coleta de sangue para hemograma completo"
                    maxLength={500}
                    value={atividade.descricao}
                    onChange={(e) => alterarAtividade(indice, 'descricao', e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="botao botao--perigo botao--pequeno"
                  style={{ marginBottom: '4px' }}
                  onClick={() => removerAtividade(indice)}
                >
                  Remover
                </button>
              </div>
            ))}

            {atividades.length === 0 && (
              <p className="pn-campo__dica">
                Nenhuma atividade adicionada. Use &ldquo;+ Adicionar atividade&rdquo; para listar os procedimentos da visita.
              </p>
            )}
          </section>
        </fieldset>

        <footer className="formulario__rodape">
          <small>* Campos obrigatórios</small>
          <div className="formulario__acoes">
            {editandoId !== null && (
              <button
                type="button"
                className="botao botao--contorno"
                onClick={() => limparFormulario()}
              >
                Cancelar edição
              </button>
            )}
            <button type="submit" className="botao botao--primario" disabled={encerrado || salvando}>
              {salvando
                ? 'Salvando…'
                : editandoId !== null
                  ? 'Salvar visita'
                  : '+ Cadastrar visita'}
            </button>
          </div>
        </footer>
      </form>

      <div className="lista-visitas">
        {visitas.map((visita) => (
          <article key={visita.id} className="cartao cartao-visita">
            <header className="cartao-visita__cabecalho">
              <div>
                <div className="cartao-visita__titulo">
                  <h3>
                    Visita #{visita.ordem} · {visita.nome}
                  </h3>
                  <span className="selo selo--dia">Dia D{visita.diaPrevisto}</span>
                  {visita.janelaDias !== null && (
                    <span className="selo selo--janela">Janela ± {visita.janelaDias} dias</span>
                  )}
                </div>
                {visita.descricao && (
                  <p className="cartao-visita__descricao">{visita.descricao}</p>
                )}
                {(() => {
                  const previa = descreverDataPrevista(
                    dataReferencia,
                    horario,
                    visita.diaPrevisto,
                    visita.janelaDias,
                  )
                  if (!previa) return null
                  return (
                    <p className="previa-data previa-data--cartao">
                      📅 {previa.data}
                      {previa.janela && <> · janela de {previa.janela}</>}
                    </p>
                  )
                })()}
              </div>

              {!encerrado && (
                <div className="formulario__acoes">
                  <button
                    type="button"
                    className="botao botao--contorno botao--pequeno"
                    onClick={() => iniciarEdicao(visita)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="botao botao--perigo botao--pequeno"
                    onClick={() => confirmarExclusao(visita)}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </header>

            <table className="tabela">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Ordem</th>
                  <th>Atividade prevista</th>
                </tr>
              </thead>
              <tbody>
                {visita.atividades.map((atividade) => (
                  <tr key={atividade.id ?? atividade.ordem}>
                    <td>
                      <strong>#{atividade.ordem}</strong>
                    </td>
                    <td>{atividade.descricao}</td>
                  </tr>
                ))}
                {visita.atividades.length === 0 && (
                  <tr>
                    <td colSpan={2} className="tabela__vazia">
                      Nenhuma atividade prevista nesta visita.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </article>
        ))}

        {visitas.length === 0 && (
          <div className="cartao" style={{ padding: '20px', textAlign: 'center', color: 'var(--texto-suave)', fontSize: '12px' }}>
            Nenhuma visita prevista cadastrada neste estudo.
          </div>
        )}
      </div>

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
