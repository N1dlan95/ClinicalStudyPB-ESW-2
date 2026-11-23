---
tags:
  - figcraft
  - mcp
  - agents
  - prototypes
  - tutorial
atualizado: 2026-11-16
---

# Configurando o FigCraft e o FigCraft com Agentes de IA (MCP)

> [!info] Objetivo deste guia
> Tutorial passo a passo para configurar o **FigCraft** como um servidor MCP para agentes de IA (como o Antigravity), conectando-o a uma **janela ativa do aplicativo desktop** (`--control` / `--attach`) ou executando-o em **modo sem interface gráfica (headless)**. O guia também aborda o trabalho com arquivos `.figcraft` e `.fig`, além de mostrar como acompanhar, em tempo real, a criação de protótipos pelo agente.

---

## 1. Pré-requisitos e instalação local

O FigCraft é uma ferramenta de código aberto, desenvolvida em Rust, para criação de interfaces e prototipagem. Seu formato de arquivo nativo é `.figcraft`, mas também oferece suporte à abertura e exportação (com compatibilidade sujeita a limitações) de arquivos `.fig` do Figma.

Nesta configuração, o FigCraft está instalado em `C:\Tools\figcraft\`:

| Executável | Função |
| --- | --- |
| `C:\Tools\figcraft\figcraft.exe` | Aplicativo desktop com interface gráfica (canvas, camadas, visualização de protótipos e servidor de controle em tempo real). |
| `C:\Tools\figcraft\figcraft-cli.exe` | Ferramenta de linha de comando (CLI) e **servidor MCP**, por meio do subcomando `mcp`, para utilização pelos agentes de IA. |

> [!note] Formatos de arquivo
> - **`.figcraft`** — Formato nativo de arquivo local do FigCraft (recomendado para salvar e editar projetos).
> - **`.fig`** — Arquivos de design do Figma. O FigCraft consegue abrir arquivos `.fig` (com compatibilidade sujeita a limitações) e gerar cópias experimentais de exportação `.fig` por meio de `save_file`.
> - O comando `open_file` também oferece suporte aos formatos `.json` (JSON de arquivos do FigCraft ou da API REST do Figma), `.sketch`, `.svg` e arquivos de imagem.

---

## 2. Configurando o FigCraft MCP para agentes

O Antigravity identifica os servidores MCP por meio do arquivo de configuração global:

- **Caminho:** `~/.gemini/config/mcp_config.json`
- No Windows: `C:\Users\<seu-usuário>\.gemini\config\mcp_config.json`

Você pode executar o FigCraft com agentes de IA em **dois modos**:

### Modo A: Modo conectado em tempo real (recomendado — acompanhamento ao vivo)

No modo conectado (*Attached Mode*), você abre o aplicativo desktop do FigCraft com uma porta de controle local. Em seguida, o servidor MCP do agente se conecta à janela já aberta, permitindo que todas as alterações sejam exibidas em tempo real na sua tela.

#### Etapa 1 — Iniciar o FigCraft com o servidor de controle

Abra o PowerShell e execute:

```powershell
& "C:\Tools\figcraft\figcraft.exe" --control 7979
```

Isso inicia a janela do FigCraft com um servidor de controle local, disponível apenas na interface de loopback, escutando em `127.0.0.1:7979`.

#### Etapa 2 — Configurar o `mcp_config.json` com `--attach`

Edite o arquivo `~/.gemini/config/mcp_config.json` e adicione `"figcraft"` dentro de `"mcpServers"`:

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

> [!warning] Mantenha a porta e as barras invertidas consistentes
> - A porta informada em `--attach 7979` deve ser a mesma utilizada em `figcraft.exe --control 7979`.
> - Lembre-se de escapar as barras invertidas do Windows (`\\`) dentro das strings JSON.
> - O FigCraft precisa estar em execução com `--control 7979` antes que o agente utilize as ferramentas do FigCraft no modo conectado.

---

### Modo B: Modo sem interface gráfica (mecanismo em segundo plano)

Se você não precisa acompanhar o canvas em tempo real e deseja que o agente gere ou edite arquivos `.figcraft` diretamente em segundo plano, sem abrir uma janela, utilize esta configuração:

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

#### Parâmetros opcionais úteis para `figcraft-cli mcp`

| Parâmetro | Descrição |
| --- | --- |
| `--attach <PORT>` | Conecta-se a uma instância do FigCraft já em execução com `figcraft --control <PORT>`. Informar apenas a porta equivale a utilizar `127.0.0.1:PORT`. |
| `--timeout <SECONDS>` | Tempo máximo de espera, em segundos, por solicitação enviada ao aplicativo conectado (`1`–`600`, padrão: `60`). |
| `--no-system-fonts` | Utiliza somente as fontes incorporadas ao FigCraft para garantir uma disposição de texto consistente entre diferentes computadores. Também pode ser ativado pela variável `FIGCRAFT_NO_SYSTEM_FONTS=1`. |
| `--automation-read-root <DIR>` | **(Somente no modo sem interface gráfica)** Restringe as pastas que podem ser lidas. Pode ser repetido, mas o diretório precisa existir. Não é permitido com `--attach`. |
| `--automation-write-root <DIR>` | **(Somente no modo sem interface gráfica)** Restringe as pastas nas quais é permitido ler e escrever. Pode ser repetido, mas o diretório precisa existir. Não é permitido com `--attach`. |

---

## 3. Aplicando e verificando a configuração

1. Salve o arquivo `~/.gemini/config/mcp_config.json`.
2. Inicie uma nova sessão do Antigravity (ou recarregue os servidores MCP) e acesse **Additional Options (`...`) > MCP Servers** na interface para confirmar que o servidor `figcraft` aparece na lista e foi identificado corretamente.
3. Peça ao agente para verificar a conexão. Por exemplo:

   > "Inspecione a interface atual do FigCraft e documente o que está aberto."

   Nos bastidores, o agente executará os comandos `inspect_ui` e `inspect_document` para verificar a janela ativa e o documento aberto, como `Untitled` ou o arquivo que você carregou.

---

## 4. Trabalhando com o FigCraft e agentes de IA

### Abrindo um arquivo `.fig` ou `.figcraft` existente

Não é necessário alterar nenhuma configuração do ambiente para editar um arquivo existente. Você pode utilizar qualquer um dos métodos abaixo:

1. **Solicitar ao agente pelo chat:** informe o caminho completo do arquivo. Por exemplo:

   > "Abra o arquivo `C:\figcraftPrototypes\Eng2\ClinicalStudyPB - ES2.fig` no FigCraft."

   O agente carregará o arquivo utilizando o comando `open_file`.

2. **Abrir diretamente no aplicativo FigCraft:** utilize **File ▸ Open** (`Ctrl+O`) ou arraste o arquivo para dentro da janela do FigCraft. Por padrão, o agente atuará na aba ativa que estiver em primeiro plano.

### Definindo onde os arquivos de saída serão salvos

Por padrão, se você não especificar uma pasta, o agente poderá salvar um novo documento sem título no diretório do usuário (por exemplo, `C:\Users\<seu-usuário>\`) ou no diretório de trabalho atual.

Sempre especifique o caminho de destino no seu comando. Por exemplo:

> "Salve este protótipo em `C:\Repositorios\ClinicalStudyPB-ESW-2\docs\ClinicalStudyPB-Docs\Prototipos\login.figcraft`."

### Acompanhando o trabalho do agente em tempo real

1. **Janela ao vivo lado a lado (Attached Mode):** mantenha a janela `<Documento> – FigCraft` aberta ao lado do chat do agente. Cada elemento, configuração de layout automático (*auto-layout*), estilo e conexão do protótipo aparecerá diretamente no canvas enquanto o agente executa os comandos.

2. **Capturas de tela durante as etapas:** solicite ao agente:

   > "Faça uma captura de tela após cada etapa concluída."

   O agente utilizará `screenshot` ou `screenshot` com `window: true`, no modo conectado, para capturar toda a janela do aplicativo.

3. **Sessão de colaboração ao vivo (Multiplayer):** durante uma sessão, o agente pode compartilhar o documento por meio de `collab.share` e fornecer um código de acesso. Você poderá utilizá-lo no FigCraft por meio de **File ▸ Join live session** ou **Share ▸ Start sharing**, dentro do aplicativo.

4. **Testando o protótipo interativo:** abra o arquivo `.figcraft` no FigCraft e pressione:

   - **`Shift + Space`** — Abre a sobreposição de visualização do protótipo em tempo real (*Live Prototype Preview*).
   - **`Alt + Ctrl + Enter`** — Abre o modo de apresentação em tela cheia, com moldura de dispositivo (*Full Presentation Mode*).

---

## 5. Comandos úteis do `figcraft-cli` (sem utilizar um agente)

Também é possível automatizar exportações e renderizações diretamente pelo PowerShell ou por scripts de integração contínua (CI):

```powershell
# Renderizar uma página ou frame em PNG
C:\Tools\figcraft\figcraft-cli.exe render prototype.figcraft -o preview.png --scale 2

# Exportar camadas para SVG
C:\Tools\figcraft\figcraft-cli.exe export prototype.figcraft -o out\ --format svg

# Executar um script de comandos JSON em modo sem interface gráfica
C:\Tools\figcraft\figcraft-cli.exe run build-card.json --out card.figcraft

# Consultar os comandos disponíveis do FigCraft (mais de 400 comandos)
C:\Tools\figcraft\figcraft-cli.exe commands --filter autoLayout
```

---