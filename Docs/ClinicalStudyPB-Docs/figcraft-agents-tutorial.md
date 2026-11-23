---
tags:
  - figcraft
  - mcp
  - agents
  - prototypes
  - tutorial
atualizado: 2026-11-16
---

# Configuring FigCraft and FigCraft + AI Agents (MCP)

> [!info] Purpose of this guide
> Step-by-step tutorial for setting up **FigCraft** as an MCP server for AI agents (such as Antigravity), connecting to a **live desktop window** (`--control` / `--attach`) or running in **headless mode**, working with `.figcraft` and `.fig` files, and watching the agent build prototypes in real time.

---

## 1. Prerequisites & Local Installation

FigCraft is an open-source, Rust-based interface design and prototyping tool. Its native file format is `.figcraft`, and it also supports best-effort opening/exporting of `.fig` (Figma) files.

On this setup, FigCraft is installed in `C:\Tools\figcraft\`:

| Binary | Role |
| --- | --- |
| `C:\Tools\figcraft\figcraft.exe` | Desktop GUI application (canvas, layers, prototype preview, live control server) |
| `C:\Tools\figcraft\figcraft-cli.exe` | CLI tool and **MCP server** (`mcp` subcommand) for AI agents |

> [!note] File formats
> - **`.figcraft`** — FigCraft's native local-first archive format (recommended for saving and editing).
> - **`.fig`** — Figma design files. FigCraft can open `.fig` files (best effort) and write experimental `.fig` export copies via `save_file`.
> - Also supported by `open_file`: `.json` (FigCraft or Figma REST API file JSON), `.sketch`, `.svg`, and image files.

---

## 2. Configuring FigCraft MCP for Agents

Antigravity discovers MCP servers from the global configuration file:

- **Path:** `~/.gemini/config/mcp_config.json` (on Windows: `C:\Users\<your-user>\.gemini\config\mcp_config.json`)

You can run FigCraft with AI agents in **two modes**:

### Mode A: Live Attached Mode (Recommended — Watch in Real Time)

In Attached Mode, you open the FigCraft desktop app with a local control port, and the agent's MCP server attaches to that running window so every change renders live on your screen.

#### Step 1 — Launch FigCraft with the control server

Open PowerShell and run:

```powershell
& "C:\Tools\figcraft\figcraft.exe" --control 7979
```

This starts the FigCraft desktop window with a loopback-only control server listening on `127.0.0.1:7979`.

#### Step 2 — Configure `mcp_config.json` with `--attach`

Edit `~/.gemini/config/mcp_config.json` and add `"figcraft"` under `"mcpServers"`:

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

> [!warning] Keep the port and backslashes consistent
> - The port in `--attach 7979` must match the port passed to `figcraft.exe --control 7979`.
> - Remember to escape Windows backslashes (`\\`) inside JSON strings.
> - FigCraft must be running with `--control 7979` before the agent invokes FigCraft tools in attached mode.

---

### Mode B: Headless Mode (Fast Background Engine, No Window)

If you don't need to watch the canvas live and want the agent to generate or edit `.figcraft` files purely in the background:

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

#### Useful optional flags for `figcraft-cli mcp`

| Flag | Description |
| --- | --- |
| `--attach <PORT>` | Attach to a running `figcraft --control <PORT>` instance (bare port means `127.0.0.1:PORT`). |
| `--timeout <SECONDS>` | Max wait per request to the attached app (`1`–`600`, default `60`). |
| `--no-system-fonts` | Use only fonts built into FigCraft for reproducible text layout across machines (or set `FIGCRAFT_NO_SYSTEM_FONTS=1`). |
| `--automation-read-root <DIR>` | *(Headless only)* Confine readable folders (repeatable; directory must exist). Refused when using `--attach`. |
| `--automation-write-root <DIR>` | *(Headless only)* Confine readable/writable folders (repeatable; directory must exist). Refused when using `--attach`. |

---

## 3. Applying & Verifying the Configuration

1. Save `~/.gemini/config/mcp_config.json`.
2. Start a new Antigravity session (or reload MCP servers) and inspect **Additional Options (`...`) > MCP Servers** in the UI to confirm `figcraft` is listed and discovered.
3. Ask the agent to check the connection (for example: *"Inspect the current FigCraft UI and document"*). Behind the scenes, the agent calls `inspect_ui` / `inspect_document` and confirms the active window and document (such as `Untitled` or your loaded file).

---

## 4. Working with FigCraft + Agents

### Opening an existing `.fig` or `.figcraft` file

You do not need to change any environment settings to edit an existing file. Use either method:

1. **Ask the agent in chat:** Give the full path, e.g.:
   > *"Open `C:\figcraftPrototypes\Eng2\ClinicalStudyPB - ES2.fig` in FigCraft."*
   The agent loads it using `open_file`.
2. **Open directly in the FigCraft app:** Use **File ▸ Open** (`Ctrl+O`) or drag and drop the file into the FigCraft window. The agent acts on the active front tab by default.

### Controlling where output files are saved

By default, if you don't specify a folder, an agent may save a new untitled document into your user directory (e.g., `C:\Users\<your-user>\`) or the current working directory.

Always specify the target path in your prompt, for example:
> *"Save this prototype to `C:\Repositorios\ClinicalStudyPB-ESW-2\docs\ClinicalStudyPB-Docs\Prototipos\login.figcraft`."*

### Watching the agent work in real time

1. **Side-by-side Live Window (Attached Mode):** Keep the `<Document> – FigCraft` window next to your agent chat. Every frame, auto-layout, style, and prototype connection appears live on the canvas as the agent executes commands.
2. **In-Chat Milestone Screenshots:** Ask the agent to *"take a screenshot after each milestone"* (uses `screenshot`, or `screenshot` with `window: true` in attached mode to capture the full app window).
3. **Live Collaboration Session (Multiplayer):** In a session, the agent can share the document (`collab.share`) and give you a join code, which you open in FigCraft via **File ▸ Join live session** (or **Share ▸ Start sharing** in the app).
4. **Testing the Interactive Prototype:** Open the `.figcraft` file in FigCraft and press:
   - **`Shift + Space`** — Live Prototype Preview overlay
   - **`Alt + Ctrl + Enter`** — Full Presentation Mode with device frame

---

## 5. Useful `figcraft-cli` Commands (Without an Agent)

You can also automate exports and renders directly from PowerShell or CI scripts:

```powershell
# Render a page/frame to PNG
C:\Tools\figcraft\figcraft-cli.exe render prototype.figcraft -o preview.png --scale 2

# Export layers to SVG
C:\Tools\figcraft\figcraft-cli.exe export prototype.figcraft -o out\ --format svg

# Execute a JSON command script headlessly
C:\Tools\figcraft\figcraft-cli.exe run build-card.json --out card.figcraft

# Inspect available FigCraft commands (400+ commands)
C:\Tools\figcraft\figcraft-cli.exe commands --filter autoLayout
```
