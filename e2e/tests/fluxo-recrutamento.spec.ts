import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'

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
async function evidencia(page: Page, testInfo: TestInfo, nome: string) {
  const print = await page.screenshot({ path: `evidencias/${nome}.png`, fullPage: true })
  await testInfo.attach(nome, { body: print, contentType: 'image/png' })
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

test('fluxo completo: estudo, critérios, recrutamento, candidatos, avaliação, consentimento e inclusão', async ({
  browser,
  request,
}, testInfo) => {
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

  // ---- 3. Pesquisador inicia o recrutamento (RF07)
  await pesquisador.goto(`/estudos/${estudoId}/estado`)
  await pesquisador.getByRole('button', { name: 'Iniciar recrutamento' }).click()
  await confirmarDialogo(pesquisador, 'Confirmar mudança')
  await expect(pesquisador.getByText('Estado do estudo alterado para Recrutamento.')).toBeVisible()
  await evidencia(pesquisador, testInfo, '04-recrutamento-iniciado')
  await pesquisador.close()

  // ---- 4. Coordenador cadastra dois candidatos (RF08)
  const coordenador = await browser.newPage()
  await entrar(coordenador, COORDENADOR)
  await cadastrarCandidato(coordenador, estudoId, 'João Candidato', `joao.${execucao}@exemplo.test`)
  await cadastrarCandidato(coordenador, estudoId, 'Maria Candidata', `maria.${execucao}@exemplo.test`)
  await coordenador.goto(`/estudos/${estudoId}/candidatos`)
  await expect(coordenador.locator('tbody tr', { hasText: 'João Candidato' })).toContainText('Cadastrado')
  await expect(coordenador.locator('tbody tr', { hasText: 'Maria Candidata' })).toContainText('Cadastrado')
  await evidencia(coordenador, testInfo, '05-candidatos-cadastrados')

  // ---- 5. Coordenador avalia os dois como elegíveis (RF09)
  await avaliarComoElegivel(coordenador, estudoId, 'João Candidato')
  await evidencia(coordenador, testInfo, '06-avaliacao-elegivel')
  await avaliarComoElegivel(coordenador, estudoId, 'Maria Candidata')

  // ---- 6. Caso de erro: sem consentimento, a inclusão fica bloqueada
  await abrirCandidato(coordenador, estudoId, 'João Candidato')
  await expect(coordenador.getByText('Registre o consentimento do candidato antes de incluir.')).toBeVisible()
  await expect(coordenador.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  await evidencia(coordenador, testInfo, '07-erro-inclusao-sem-consentimento')

  // ---- 7. Coordenador registra o consentimento (RF10)
  await coordenador.getByRole('button', { name: 'Registrar consentimento' }).click()
  await confirmarDialogo(coordenador, 'Confirmar registro')
  await expect(coordenador.getByText('Consentimento registrado. O candidato já pode ser incluído no estudo.')).toBeVisible()
  await evidencia(coordenador, testInfo, '08-consentimento-registrado')

  // ---- 8. Coordenador inclui o candidato e a única vaga é ocupada (RF11)
  await coordenador.getByRole('button', { name: 'Incluir no estudo' }).click()
  await confirmarDialogo(coordenador, 'Confirmar inclusão')
  await expect(coordenador.getByText('Candidato incluído no estudo. Vagas ocupadas: 1 de 1.')).toBeVisible()
  await expect(coordenador.locator('.consentimento__registrado', { hasText: 'Incluído no estudo' })).toBeVisible()
  await evidencia(coordenador, testInfo, '09-candidato-incluido')

  // ---- 9. Caso de erro: a segunda candidata, mesmo com consentimento, não entra porque as vagas esgotaram
  await abrirCandidato(coordenador, estudoId, 'Maria Candidata')
  await coordenador.getByRole('button', { name: 'Registrar consentimento' }).click()
  await confirmarDialogo(coordenador, 'Confirmar registro')
  await expect(coordenador.getByText(/Todas as vagas do estudo estão ocupadas/)).toBeVisible()
  await expect(coordenador.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  await evidencia(coordenador, testInfo, '10-erro-vagas-esgotadas')

  // A API confirma o bloqueio, mesmo que alguém tente incluir sem passar pela tela
  const login = await request.post('/api/auth/login', { data: { email: COORDENADOR, senha: SENHA } })
  const autorizacao = { Authorization: `Bearer ${(await login.json()).token}` }
  const candidatos = (await (await request.get(`/api/estudos/${estudoId}/candidatos`, { headers: autorizacao })).json())
    .content as { id: number; nome: string }[]
  const maria = candidatos.find((c) => c.nome === 'Maria Candidata')!.id
  const inclusao = await request.post(`/api/candidatos/${maria}/inclusao`, { headers: autorizacao })
  expect(inclusao.status()).toBe(409)
  expect((await inclusao.json()).codigo).toBe('VAGAS_ESGOTADAS')

  await coordenador.close()
})
