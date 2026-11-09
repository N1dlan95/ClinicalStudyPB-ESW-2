import '../../estilos/estudos.css'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AbasEstudo } from './AbasEstudo'
import { brParaIso, isoParaBR, mascaraData } from './datas'
import {
  ErroEstudoApi,
  atualizarEstudo,
  buscarEstudo,
  criarEstudo,
  listarPesquisadores,
  traduzirErro,
} from './estudosService'
import {
  ROTULO_ESTADO,
  type CampoEstudo,
  type Estudo,
  type ErrosEstudo,
  type FormularioEstudo,
  type Pesquisador,
} from './tipos'
import { OBJETIVO_MAX, ORDEM_CAMPOS, ROTULO_CAMPO, validarEstudo } from './validacao'

const FORMULARIO_VAZIO: FormularioEstudo = {
  titulo: '',
  objetivo: '',
  responsavelId: '',
  dataInicio: '',
  dataFim: '',
  limiteParticipantes: '',
}

function classeEntrada(erro?: string) {
  return erro ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
}

// Junta a lista vinda da API com quem precisa aparecer (usuário logado, responsável atual)
function comOpcao(lista: Pesquisador[], extra: Pesquisador | null): Pesquisador[] {
  if (!extra || lista.some((p) => p.id === extra.id)) return lista
  return [...lista, extra]
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

export function EstudoFormPage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { usuario } = useAuth()
  const edicao = Boolean(id)

  const [form, setForm] = useState<FormularioEstudo>(FORMULARIO_VAZIO)
  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([])
  const [erros, setErros] = useState<ErrosEstudo>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const encerrado = estudo?.estado === 'ENCERRADO'

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        // null: o perfil logado não pode listar usuários (rota só do administrador)
        const daApi = await listarPesquisadores()
        const logado =
          usuario?.perfil === 'PESQUISADOR' ? { id: usuario.id, nome: usuario.nome } : null
        let lista = comOpcao(daApi ?? [], logado)

        let existente: Estudo | null = null
        if (id) {
          existente = await buscarEstudo(Number(id))
          lista = comOpcao(lista, existente.responsavel)
        }
        if (!ativo) return

        setPesquisadores(lista)
        if (existente) {
          setEstudo(existente)
          setForm({
            titulo: existente.titulo,
            objetivo: existente.objetivo ?? '',
            responsavelId: String(existente.responsavel.id),
            dataInicio: isoParaBR(existente.dataInicio),
            dataFim: isoParaBR(existente.dataFim),
            limiteParticipantes: String(existente.limiteParticipantes),
          })
        } else if (lista.length === 1) {
          // Só há uma opção (normalmente o próprio pesquisador): já vem selecionada
          setForm((atual) => ({ ...atual, responsavelId: String(lista[0].id) }))
        }
      } catch (erro) {
        if (ativo) {
          setMensagemErro(`Não foi possível carregar os dados. ${traduzirErro(erro).message}`)
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [id, usuario])

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

  function mostrarErros(encontrados: ErrosEstudo) {
    setErros(encontrados)
    const camposComErro = ORDEM_CAMPOS.filter((c) => encontrados[c])
    if (camposComErro.length === 1) {
      setMensagemErro(`Corrija o campo destacado para ${edicao ? 'salvar' : 'cadastrar'} o estudo.`)
    }
    return camposComErro.length
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')

    if (mostrarErros(validarEstudo(form)) > 0) return

    const dados = {
      titulo: form.titulo.trim(),
      objetivo: form.objetivo.trim(),
      responsavelId: Number(form.responsavelId),
      dataInicio: brParaIso(form.dataInicio) ?? '',
      dataFim: form.dataFim.trim() ? brParaIso(form.dataFim) : null,
      limiteParticipantes: Number(form.limiteParticipantes),
    }

    setSalvando(true)
    try {
      if (id) await atualizarEstudo(Number(id), dados)
      else await criarEstudo(dados)
      navegar('/estudos')
    } catch (erro) {
      const erroApi: ErroEstudoApi = traduzirErro(erro)
      // Erros de validação do backend aparecem nos próprios campos
      if (mostrarErros(erroApi.errosCampos) > 0) return
      setMensagemErro(
        `${edicao ? 'Não foi possível salvar as alterações.' : 'Não foi possível cadastrar o estudo.'} ${erroApi.message}`,
      )
    } finally {
      setSalvando(false)
    }
  }

  const camposComErro = ORDEM_CAMPOS.filter((c) => erros[c])

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
      {edicao && id && <AbasEstudo estudoId={Number(id)} ativa="dados" />}
      <div className="titulo-com-selo">
        <h1>{edicao ? 'Editar estudo' : 'Novo estudo'}</h1>
        {estudo && (
          <span className={`selo selo--${estudo.estado.toLowerCase()}`}>{ROTULO_ESTADO[estudo.estado]}</span>
        )}
      </div>

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
      {encerrado && (
        <div className="aviso aviso--atencao">Estudo encerrado não pode ser editado.</div>
      )}
      {!edicao && (
        <div className="aviso aviso--info">
          O estudo é criado no estado Planejamento. A mudança de estado é feita depois do cadastro.
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={encerrado}>
          <section>
            <h2>Identificação</h2>
            <Campo rotulo="Título do estudo" obrigatorio erro={erros.titulo}>
              <input
                className={classeEntrada(erros.titulo)}
                placeholder="Ex.: Estudo de exemplo C"
                maxLength={200}
                value={form.titulo}
                onChange={(e) => alterar('titulo', e.target.value)}
              />
            </Campo>
            <Campo
              rotulo="Objetivo"
              obrigatorio
              erro={erros.objetivo}
              dica={`Até ${OBJETIVO_MAX} caracteres. Um resumo curto aparece para o participante no aplicativo.`}
            >
              <textarea
                className={classeEntrada(erros.objetivo)}
                rows={3}
                maxLength={OBJETIVO_MAX}
                placeholder="Objetivo do estudo e informações para a equipe"
                value={form.objetivo}
                onChange={(e) => alterar('objetivo', e.target.value)}
              />
            </Campo>
          </section>

          <section>
            <h2>Responsável</h2>
            <Campo
              rotulo="Pesquisador responsável"
              obrigatorio
              erro={erros.responsavelId}
              dica="Usuário ativo com perfil Pesquisador."
            >
              <select
                className={classeEntrada(erros.responsavelId)}
                value={form.responsavelId}
                onChange={(e) => alterar('responsavelId', e.target.value)}
              >
                <option value="">Selecione</option>
                {pesquisadores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </section>

          <section>
            <h2>Período e vagas</h2>
            <div className="formulario__grade">
              <Campo rotulo="Data de início" obrigatorio erro={erros.dataInicio}>
                <input
                  className={classeEntrada(erros.dataInicio)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  value={form.dataInicio}
                  onChange={(e) => alterar('dataInicio', mascaraData(e.target.value))}
                />
              </Campo>
              <Campo
                rotulo="Data de término prevista"
                erro={erros.dataFim}
                dica="Opcional. Não pode ser anterior à data de início."
              >
                <input
                  className={classeEntrada(erros.dataFim)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  value={form.dataFim}
                  onChange={(e) => alterar('dataFim', mascaraData(e.target.value))}
                />
              </Campo>
              <Campo
                rotulo="Limite de participantes"
                obrigatorio
                erro={erros.limiteParticipantes}
                dica="Ao atingir o limite, novas inclusões ficam bloqueadas."
              >
                <input
                  className={classeEntrada(erros.limiteParticipantes)}
                  placeholder="Ex.: 30"
                  inputMode="numeric"
                  value={form.limiteParticipantes}
                  onChange={(e) => alterar('limiteParticipantes', e.target.value.replace(/\D/g, ''))}
                />
              </Campo>
            </div>
          </section>
        </fieldset>

        <footer className="formulario__rodape">
          <small>* Campos obrigatórios</small>
          <div className="formulario__acoes">
            <button type="button" className="botao botao--contorno" onClick={() => navegar('/estudos')}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={salvando || encerrado}>
              {salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar estudo'}
            </button>
          </div>
        </footer>
      </form>

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
