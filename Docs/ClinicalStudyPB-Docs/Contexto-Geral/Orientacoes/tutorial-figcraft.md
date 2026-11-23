---
tags:
  - figcraft
  - mcp
  - prototipos
  - agentes
  - tutorial
  - clinicalstudypb
atualizado: 2026-11-21
---

# Guia e Tutorial: FigCraft & Prototipagem com Agentes de IA (MCP)

> [!info] Objetivo deste documento
> Este tutorial orienta a equipe do **ClinicalStudyPB** sobre como utilizar o **FigCraft** (alternativa open-source ao Figma), como configurá-lo como servidor **MCP (Model Context Protocol)** para agentes de IA (como Antigravity), e como instruir agentes a gerar e atualizar protótipos de tela em tempo real.

---

## 1. Visão Geral: Por que FigCraft?

O **FigCraft** é uma ferramenta de design de interface e prototipagem desenvolvida em Rust, local-first e de código aberto. Ele foi concebido como uma reimplementação limpa do fluxo de trabalho do Figma.

* **100% Gratuito e Offline:** Não requer conta educacional, login ou planos pagos na nuvem.
* **Formatos de Arquivo:**
  * `.figcraft`: Formato de arquivo local nativo (recomendado para salvar e versionar no repositório).
  * `.fig`: Arquivos do Figma. O FigCraft abre arquivos `.fig` nativamente (*best-effort*), convertendo páginas, frames, auto-layout, estilos e componentes.
* **Repositório de Protótipos do Projeto:**
  * Os arquivos de tela da equipe ficam versionados em:  
    `Docs/ClinicalStudyPB-Docs/PrototiposTela/`

---

## 2. Como Usar o FigCraft (Interface Desktop)

Os executáveis do FigCraft na máquina de desenvolvimento ficam em:
* **Aplicativo Visual (GUI):** `C:\Tools\figcraft\figcraft.exe`
* **CLI & Servidor MCP:** `C:\Tools\figcraft\figcraft-cli.exe`

### Abrindo Projetos Existentes
1. Dê um duplo clique em `figcraft.exe` ou execute no terminal:
   ```powershell
   & "C:\Tools\figcraft\figcraft.exe"
   ```
2. Abra o arquivo do projeto via **File ▸ Open** (`Ctrl + O`) ou arraste o arquivo para a janela.
3. Para abrir direto o protótipo da Sprint 2:
   ```powershell
   & "C:\Tools\figcraft\figcraft.exe" "C:\Repositorios\ClinicalStudyPB-ESW-2\Docs\ClinicalStudyPB-Docs\PrototiposTela\ClinicalStudyPB - ES2 - Sprint2.figcraft"
   ```

### Atalhos e Funcionalidades Principais
| Ação | Atalho | Descrição |
| :--- | :--- | :--- |
| **Preview Interativo** | `Shift + Space` | Abre o player interativo em overlay sobre o canvas. |
| **Apresentação Completa** | `Alt + Ctrl + Enter` | Modo apresentação tela cheia com moldura de dispositivo. |
| **Auto-Layout** | `Shift + A` | Adiciona layout flexível automático ao frame selecionado. |
| **Exportar Telas / Assets** | `Ctrl + Shift + E` | Exporta frames ou camadas em PNG, SVG, JPG ou PDF. |

---

## 3. Configuração do Servidor MCP para Agentes de IA

O FigCraft possui um servidor MCP embutido no `figcraft-cli.exe`, permitindo que agentes de IA leiam, criem e alterem elementos de design diretamente.

O arquivo de configuração global do agente fica em:  
`C:\Users\<seu-usuario>\.gemini\config\mcp_config.json`

Existem dois modos de operação:

### Modo A: Live / Attached (Recomendado — Visualização ao Vivo)

Neste modo, o aplicativo desktop fica aberto na sua tela e o agente desenha e atualiza as telas em tempo real enquanto você acompanha.

#### 1. Iniciar o FigCraft com a porta de controle
Abra o PowerShell e execute:
```powershell
& "C:\Tools\figcraft\figcraft.exe" --control 7979
```

#### 2. Configurar o `mcp_config.json`
Edite `C:\Users\<seu-usuario>\.gemini\config\mcp_config.json` para adicionar o parâmetro `--attach`:
```json
{
  "mcpServers": {
    "figcraft": {
      "command": "C:\\Tools\\figcraft\\figcraft-cli.exe",
      "args": ["mcp", "--attach", "7979"]
    }
  }
}
```

---

### Modo B: Headless (Segundo Plano)

Se preferir que o agente trabalhe em silêncio sem abrir janelas gráficas, utilize a configuração padrão:
```json
{
  "mcpServers": {
    "figcraft": {
      "command": "C:\\Tools\\figcraft\\figcraft-cli.exe",
      "args": ["mcp"]
    }
  }
}
```

---

## 4. Como Solicitar Protótipos ao Agente de IA

Para obter os melhores resultados com o agente no FigCraft, siga a estrutura de prompt recomendada:

### Estrutura de um Bom Prompt
1. **Contexto do Arquivo:** Indique se deseja abrir um arquivo existente ou criar um novo canvas.
2. **Especificação da Tela:** Forneça o nome do frame, dimensões (ex: Mobile 390x844 ou Desktop 1440x900) e público-alvo (Pesquisador, Administrador ou Participante).
3. **Componentes e Conteúdo:** Liste títulos, campos de formulário, botões, auto-layout e cores/estilos.
4. **Interatividade / Prototipagem:** Especifique transições de clique entre botões e telas destino.
5. **Caminho para Salvar:** Sempre oriente o agente a salvar o resultado em `Docs\ClinicalStudyPB-Docs\PrototiposTela\`.

---

### Exemplos Práticos de Prompts

#### Exemplo 1: Criando uma nova tela do zero
> *"Abra um novo arquivo no FigCraft e crie a tela de **Login do Pesquisador** para o ClinicalStudyPB. Use um frame Desktop (1440x900), com auto-layout centralizado, paleta de cores azul (#1E40AF e #3B82F6), campos para E-mail e Senha, botão 'Entrar' e link 'Esqueci minha senha'. Salve o arquivo em `C:\Repositorios\ClinicalStudyPB-ESW-2\Docs\ClinicalStudyPB-Docs\PrototiposTela\Login-Pesquisador.figcraft`."*

#### Exemplo 2: Modificando o protótipo da Sprint 2
> *"No FigCraft, abra o arquivo `C:\Repositorios\ClinicalStudyPB-ESW-2\Docs\ClinicalStudyPB-Docs\PrototiposTela\ClinicalStudyPB - ES2 - Sprint2.figcraft`. Na tela de 'Listagem de Estudos Clínicos', adicione uma barra de busca no topo e um botão 'Novo Estudo' com ícone de adição. Mantenha os estilos e salve as alterações."*

#### Exemplo 3: Prototipagem Interativa (Conectar Telas)
> *"No protótipo ativo no FigCraft, conecte o evento de clique do botão 'Iniciar Triagem' na tela 'Dashboard' para navegar até a tela 'Formulário de Triagem' com transição Instant. Ao final, tire um screenshot para eu conferir."*

---

## 5. Boas Práticas para o Repositório

1. **Versionamento:** Mantenha os arquivos `.figcraft` comitados em `Docs/ClinicalStudyPB-Docs/PrototiposTela/`.
2. **Exportação para Documentação:** Para incluir capturas das telas no README ou relatórios de sprint, exporte imagens PNG dos frames principais usando:
   ```powershell
   & "C:\Tools\figcraft\figcraft-cli.exe" render "C:\Repositorios\ClinicalStudyPB-ESW-2\Docs\ClinicalStudyPB-Docs\PrototiposTela\ClinicalStudyPB - ES2 - Sprint2.figcraft" -o "Docs\ClinicalStudyPB-Docs\PrototiposTela\preview.png" --scale 2
   ```
3. **Compatibilidade com Figma:** Se precisar abrir uma tela no Figma tradicional posteriormente, exporte as camadas para SVG ou PDF pelo menu de exportação do FigCraft.
