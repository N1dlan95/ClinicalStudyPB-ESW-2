import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { fileURLToPath } from 'node:url'

// Task 3574: fluxo web completo da Release 1, todo pela tela, com as contas da migração V2 e o perfil certo
// em cada etapa: cadastrar estudo, critérios e iniciar recrutamento (pesquisador) > cadastrar candidatos,
// avaliar, consentir e incluir (coordenador). Casos de erro: inclusão sem consentimento e vagas esgotadas.

const SENHA = 'Senha@123'
const PESQUISADOR = 'pesquisador@clinicalstudypb.test'
const COORDENADOR = 'coordenador@clinicalstudypb.test'

// Título e e-mails únicos para o teste poder rodar várias vezes no mesmo banco
const execucao = Date.now()
const TITULO = `Estudo E2E ${execucao}`

async function entrar(page: Page, email: string) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/estudos$/)
}

// Print de cada etapa: vai para o relatório HTML e para a pasta evidencias/
async function evidencia(
  page: Page,
  testInfo: TestInfo,
  nome: string,
  destino = `evidencias/${nome}.png`,
  mascara: Locator[] = [],
) {
  const print = await page.screenshot({ path: destino, fullPage: true, mask: mascara })
  await testInfo.attach(nome, { body: print, contentType: 'image/png' })
}

function proximoHorarioDeVisita() {
  const dataHora = new Date(Date.now() + 3 * 60_000)
  dataHora.setUTCSeconds(0, 0)
  return {
    data: dataHora.toISOString().slice(0, 10),
    hora: dataHora.toISOString().slice(11, 16),
    instante: dataHora.getTime(),
  }
}

// Nos formulários de estudo e de critério, o rótulo envolve o campo e inclui a dica: busca pelo início do texto
function campo(page: Page, rotulo: string): Locator {
  return page
    .locator('label.pn-campo', { has: page.locator('.pn-campo__rotulo', { hasText: new RegExp(`^${rotulo}`) }) })
    .locator('input, textarea, select')
}

async function confirmarDialogo(page: Page, botao: string) {
  await page.getByRole('dialog').getByRole('button', { name: botao }).click()
}

async function cadastrarCandidato(page: Page, estudoId: string, nome: string, email: string) {
  await page.goto(`/estudos/${estudoId}/candidatos`)
  await page.getByRole('link', { name: '+ Novo candidato' }).click()
  await page.locator('#candidato-nome').fill(nome)
  await page.locator('#candidato-dataNascimento').pressSequentially('20051990')
  await page.locator('#candidato-email').fill(email)
  await page.getByRole('button', { name: 'Cadastrar candidato' }).click()
  await expect(page.getByRole('button', { name: 'Cadastrar candidato' })).toBeHidden()
}

// Inclusão: atende (Sim); exclusão: não apresenta (Não)
async function avaliarComoElegivel(page: Page, estudoId: string, nome: string) {
  await page.goto(`/estudos/${estudoId}/candidatos`)
  await page.locator('tbody tr', { hasText: nome }).getByRole('link', { name: 'Avaliar' }).click()
  await expect(page.getByRole('heading', { name: 'Avaliação de elegibilidade' })).toBeVisible()
  for (const [secao, resposta] of [
    ['Critérios de inclusão', 'Sim'],
    ['Critérios de exclusão', 'Não'],
  ]) {
    const grupos = page.locator('section', { has: page.getByRole('heading', { name: secao }) }).getByRole('radiogroup')
    for (const grupo of await grupos.all()) await grupo.getByLabel(resposta, { exact: true }).check()
  }
  await expect(page.getByText('Resultado calculado: Candidato Elegível.')).toBeVisible()
  await page.getByRole('button', { name: 'Registrar avaliação' }).click()
  await expect(page.getByText('Avaliação registrada com sucesso. Resultado: Elegível.')).toBeVisible()
}

async function abrirCandidato(page: Page, estudoId: string, nome: string) {
  await page.goto(`/estudos/${estudoId}/candidatos`)
  await page.locator('tbody tr', { hasText: nome }).getByRole('link', { name: 'Ver detalhes' }).click()
  await expect(page.getByRole('heading', { name: nome })).toBeVisible()
}

test('fluxo completo: inclusão e acompanhamento do participante', async ({
  browser,
  request,
}, testInfo) => {
  test.setTimeout(300_000)

  // ---- 1. Pesquisador cadastra o estudo (limite de 1 vaga, para testar o esgotamento no fim)
  const pesquisador = await browser.newPage()
  await entrar(pesquisador, PESQUISADOR)
  await pesquisador.getByRole('link', { name: '+ Novo estudo' }).click()
  await campo(pesquisador, 'Título do estudo').fill(TITULO)
  await campo(pesquisador, 'Objetivo').fill('Estudo criado pelo teste E2E (dados fictícios).')
  await campo(pesquisador, 'Data de início').pressSequentially('01122026')
  await campo(pesquisador, 'Limite de participantes').fill('1')
  await evidencia(pesquisador, testInfo, '01-cadastro-estudo')
  await pesquisador.getByRole('button', { name: 'Cadastrar estudo' }).click()
  await expect(pesquisador).toHaveURL(/\/estudos$/)
  const linhaEstudo = pesquisador.locator('tbody tr', { hasText: TITULO })
  await expect(linhaEstudo).toContainText('Planejamento')
  await evidencia(pesquisador, testInfo, '02-estudo-na-lista')
  const hrefEditar = await linhaEstudo.getByRole('link', { name: 'Editar' }).getAttribute('href')
  const estudoId = hrefEditar!.match(/\/estudos\/(\d+)\//)![1]

  // ---- 2. Pesquisador cadastra um critério de inclusão e um de exclusão (RF05)
  await linhaEstudo.getByRole('link', { name: 'Critérios' }).click()
  await expect(pesquisador.getByRole('heading', { name: 'Critérios de elegibilidade' })).toBeVisible()
  for (const [tipo, descricao] of [
    ['INCLUSAO', 'Idade entre 18 e 65 anos'],
    ['EXCLUSAO', 'Gestante'],
  ]) {
    await campo(pesquisador, 'Tipo de critério').selectOption(tipo)
    await campo(pesquisador, 'Descrição do critério').fill(descricao)
    await pesquisador.getByRole('button', { name: '+ Adicionar critério' }).click()
    await expect(pesquisador.getByText('Critério cadastrado com sucesso.')).toBeVisible()
    await expect(pesquisador.getByRole('cell', { name: descricao })).toBeVisible()
  }
  await evidencia(pesquisador, testInfo, '03-criterios')

  // ---- 3. Pesquisador cadastra visita prevista e atividade para o acompanhamento (RF12/RF14)
  await pesquisador.getByRole('link', { name: 'Visitas previstas' }).click()
  await expect(pesquisador.getByRole('heading', { name: 'Visitas previstas e atividades' })).toBeVisible()
  await pesquisador.getByLabel('Nome da visita *').fill('Visita E2E')
  await pesquisador.getByLabel('Ordem da visita *').fill('1')
  await pesquisador.getByLabel('Dia previsto (após inclusão) *').fill('0')
  await pesquisador.getByLabel('Descrição da atividade 1').fill('Pressão arterial E2E')
  await pesquisador.getByRole('button', { name: '+ Cadastrar visita' }).click()
  await expect(pesquisador.getByText('Visita prevista cadastrada com sucesso.')).toBeVisible()
  await evidencia(
    pesquisador,
    testInfo,
    'e2e-acompanhamento-01-visita-prevista',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-01-visita-prevista.png', import.meta.url)),
  )

  // ---- 4. Pesquisador inicia o recrutamento (RF07)
  await pesquisador.goto(`/estudos/${estudoId}/estado`)
  await pesquisador.getByRole('button', { name: 'Iniciar recrutamento' }).click()
  await confirmarDialogo(pesquisador, 'Confirmar mudança')
  await expect(pesquisador.getByText('Estado do estudo alterado para Recrutamento.')).toBeVisible()
  await evidencia(pesquisador, testInfo, '04-recrutamento-iniciado')
  await pesquisador.close()

  // ---- 5. Coordenador cadastra dois candidatos (RF08)
  const coordenador = await browser.newPage()
  await entrar(coordenador, COORDENADOR)
  await cadastrarCandidato(coordenador, estudoId, 'João Candidato', `joao.${execucao}@exemplo.test`)
  await cadastrarCandidato(coordenador, estudoId, 'Maria Candidata', `maria.${execucao}@exemplo.test`)
  await coordenador.goto(`/estudos/${estudoId}/candidatos`)
  await expect(coordenador.locator('tbody tr', { hasText: 'João Candidato' })).toContainText('Cadastrado')
  await expect(coordenador.locator('tbody tr', { hasText: 'Maria Candidata' })).toContainText('Cadastrado')
  await evidencia(coordenador, testInfo, '05-candidatos-cadastrados')

  // ---- 6. Coordenador avalia os dois como elegíveis (RF09)
  await avaliarComoElegivel(coordenador, estudoId, 'João Candidato')
  await evidencia(coordenador, testInfo, '06-avaliacao-elegivel')
  await avaliarComoElegivel(coordenador, estudoId, 'Maria Candidata')

  // ---- 7. Caso de erro: sem consentimento, a inclusão fica bloqueada
  await abrirCandidato(coordenador, estudoId, 'João Candidato')
  await expect(coordenador.getByText('Registre o consentimento do candidato antes de incluir.')).toBeVisible()
  await expect(coordenador.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  await evidencia(coordenador, testInfo, '07-erro-inclusao-sem-consentimento')

  // ---- 8. Coordenador registra o consentimento (RF10)
  await coordenador.getByRole('button', { name: 'Registrar consentimento' }).click()
  await confirmarDialogo(coordenador, 'Confirmar registro')
  await expect(coordenador.getByText('Consentimento registrado. O candidato já pode ser incluído no estudo.')).toBeVisible()
  await evidencia(coordenador, testInfo, '08-consentimento-registrado')

  // ---- 9. Coordenador inclui o candidato e confere o diálogo de acesso (RF11)
  await coordenador.addStyleTag({
    content: '.acesso__senha { filter: blur(8px); }',
  })
  await coordenador.getByRole('button', { name: 'Incluir no estudo' }).click()
  await confirmarDialogo(coordenador, 'Confirmar inclusão')
  await expect(coordenador.getByText('Candidato incluído no estudo. Vagas ocupadas: 1 de 1.')).toBeVisible()
  await expect(coordenador.locator('.consentimento__registrado', { hasText: 'Incluído no estudo' })).toBeVisible()
  const dialogoAcesso = coordenador.getByRole('dialog')
  await expect(dialogoAcesso.getByRole('heading', { name: 'Acesso do participante' })).toBeVisible()
  await expect(dialogoAcesso).toContainText(`joao.${execucao}@exemplo.test`)
  const senhaInicial = dialogoAcesso.locator('.acesso__senha')
  await expect(senhaInicial).toHaveText(/\S/)
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-02-acesso-participante',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-02-acesso-participante.png', import.meta.url)),
    [senhaInicial],
  )
  await dialogoAcesso.getByRole('button', { name: 'Fechar' }).click()
  await evidencia(coordenador, testInfo, '09-candidato-incluido')
  const candidatoId = Number(coordenador.url().match(/\/candidatos\/(\d+)$/)?.[1])
  expect(candidatoId).toBeGreaterThan(0)

  // ---- 10. Agenda a visita para alguns minutos depois, para poder registrá-la como realizada
  const agendamento = proximoHorarioDeVisita()
  await coordenador.getByRole('link', { name: 'Agendar visita' }).click()
  await expect(coordenador.getByRole('heading', { name: 'Agendar visita' })).toBeVisible()
  await coordenador.getByLabel('Data da visita (sugerida preenchida) *').fill(agendamento.data)
  await coordenador.getByLabel('Horário *').fill(agendamento.hora)
  await coordenador.getByLabel('Local / consultório').fill('Consultório E2E')
  await coordenador.getByRole('button', { name: 'Confirmar agendamento' }).click()
  await expect(coordenador).toHaveURL(new RegExp(`/estudos/${estudoId}/agenda$`))
  const linhaVisita = coordenador.locator('tbody tr', { hasText: 'João Candidato' })
  await expect(linhaVisita).toContainText('Visita E2E')
  await expect(linhaVisita).toContainText('Agendada')
  const linkAcaoVisita = linhaVisita.getByRole('link', {
    name: 'Registrar ação na visita de João Candidato',
  })
  const hrefAcao = await linkAcaoVisita.getAttribute('href')
  const visitaId = Number(hrefAcao?.match(/\/agenda\/(\d+)\/acoes$/)?.[1])
  expect(visitaId).toBeGreaterThan(0)
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-03-visita-agendada',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-03-visita-agendada.png', import.meta.url)),
  )

  await coordenador.waitForTimeout(Math.max(0, agendamento.instante - Date.now()))
  await linkAcaoVisita.click()
  await expect(coordenador.getByRole('heading', { name: 'Ações na visita agendada' })).toBeVisible()
  await expect(coordenador.getByRole('button', { name: 'Realizada' })).toHaveAttribute('aria-pressed', 'true')
  await coordenador.getByRole('button', { name: 'Confirmar como realizada' }).click()
  await expect(coordenador).toHaveURL(new RegExp(`/estudos/${estudoId}/agenda$`))
  await expect(coordenador.locator('tbody tr', { hasText: 'João Candidato' })).toContainText('Realizada')
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-04-visita-realizada',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-04-visita-realizada.png', import.meta.url)),
  )

  // ---- 11. Registra os resultados e confere a visita e os resultados no histórico
  await coordenador.goto(`/estudos/${estudoId}/visitas/${visitaId}/resultados`)
  await expect(coordenador.getByLabel('Resultado de Pressão arterial E2E')).toBeVisible()
  await coordenador.getByLabel('Resultado de Pressão arterial E2E').fill('120/80 mmHg')
  await coordenador.getByLabel('Observação de Pressão arterial E2E').fill('Registro fictício do E2E')
  await coordenador.getByRole('button', { name: 'Salvar resultados' }).click()
  await expect(coordenador.getByText('Resultados salvos com sucesso.')).toBeVisible()
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-05-resultados',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-05-resultados.png', import.meta.url)),
  )

  await coordenador.goto(`/estudos/${estudoId}/candidatos/${candidatoId}`)
  await coordenador.getByRole('link', { name: 'Ver histórico' }).click()
  const visitaNoHistorico = coordenador.locator('.visita-item', { hasText: 'Visita E2E' })
  await expect(visitaNoHistorico).toContainText('Realizada')
  await expect(visitaNoHistorico).toContainText('Pressão arterial E2E')
  await expect(visitaNoHistorico).toContainText('120/80 mmHg')
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-06-historico',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-06-historico.png', import.meta.url)),
  )

  // ---- 12. Caso de erro: a segunda candidata, mesmo com consentimento, não entra porque as vagas esgotaram
  await abrirCandidato(coordenador, estudoId, 'Maria Candidata')
  await coordenador.getByRole('button', { name: 'Registrar consentimento' }).click()
  await confirmarDialogo(coordenador, 'Confirmar registro')
  await expect(coordenador.getByText(/Todas as vagas do estudo estão ocupadas/)).toBeVisible()
  await expect(coordenador.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  await evidencia(coordenador, testInfo, '10-erro-vagas-esgotadas')

  // ---- 13. Retira o participante e confirma o status e a vaga liberada
  await coordenador.goto(`/estudos/${estudoId}/candidatos/${candidatoId}/historico`)
  await coordenador.getByRole('button', { name: 'Registrar retirada' }).click()
  const dialogoRetirada = coordenador.getByRole('dialog')
  await expect(dialogoRetirada).toContainText('As visitas agendadas serão canceladas e a vaga ficará disponível.')
  await dialogoRetirada.getByLabel('Motivo da retirada *').fill('Finalização do cenário E2E')
  await dialogoRetirada.getByRole('button', { name: 'Confirmar retirada' }).click()
  await expect(coordenador.getByText(/Retirada registrada\./)).toBeVisible()
  await expect(coordenador.locator('.selo--candidato-retirado')).toContainText('Retirado')
  await expect(coordenador.getByRole('status')).toContainText('Vagas ocupadas: 0 de 1')
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-07-retirada',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-07-retirada.png', import.meta.url)),
  )

  await coordenador.goto(`/estudos/${estudoId}/candidatos/${candidatoId}`)
  await expect(coordenador.locator('[aria-label="Vagas do estudo"]')).toContainText('0 de 1 vagas')
  await evidencia(
    coordenador,
    testInfo,
    'e2e-acompanhamento-08-vaga-liberada',
    fileURLToPath(new URL('../../releases/release2/img/e2e-acompanhamento-08-vaga-liberada.png', import.meta.url)),
  )

  // A API confirma o bloqueio, mesmo que alguém tente incluir sem passar pela tela
  const login = await request.post('/api/auth/login', { data: { email: COORDENADOR, senha: SENHA } })
  const autorizacao = { Authorization: `Bearer ${(await login.json()).token}` }
  const candidatos = (await (await request.get(`/api/estudos/${estudoId}/candidatos`, { headers: autorizacao })).json())
    .content as { id: number; nome: string; status: string }[]
  const maria = candidatos.find((c) => c.nome === 'Maria Candidata')!.id
  const joao = candidatos.find((c) => c.id === candidatoId)
  expect(joao?.status).toBe('RETIRADO')
  const inclusao = await request.post(`/api/candidatos/${maria}/inclusao`, { headers: autorizacao })
  expect(inclusao.status()).toBe(409)
  expect((await inclusao.json()).codigo).toBe('VAGAS_ESGOTADAS')

  await coordenador.close()
})
