# SIMBL - Simple Backlog

A CLI task manager for dev projects. Optimized for agentic coding tools (Claude Code, Cursor, etc.) with an interactive TUI for humans and a browser-based UI.

## Features

- **Markdown-based** - Tasks stored in `.simbl/tasks.md`, human-readable and version-controllable
- **Agentic-friendly** - Brief CLI output by default, one-shot commands for automation
- **Interactive TUI** - Run `simbl` with no args for a menu-driven interface
- **Web UI** - Run `simbl serve` for an HTMX-powered browser interface with live updates
- **Relationships** - Parent-child tasks and dependencies with cycle detection
- **Tags** - Priority (`[p1]`-`[p9]`), projects (`[project:auth]`), and custom tags

## Quick Start

```bash
# Install (requires Bun)
git clone https://github.com/yebot/simbl.git
cd simbl && bun install && bun run build
sudo cp dist/simbl /usr/local/bin/

# Initialize in your project
cd your-project
simbl init

# Add and manage tasks
simbl add "Fix login bug" -p 1
simbl list
simbl done task-1

# Or use the web UI
simbl serve -o
```

## Installation

### From Source (requires Bun)

```bash
git clone https://github.com/yebot/simbl.git
cd simbl
bun install
bun run build                    # ARM Mac (Apple Silicon)
# bun run build:x64              # Intel Mac

# Copy to your PATH
sudo cp dist/simbl /usr/local/bin/
```

### Development

```bash
bun install
bun run dev          # Run CLI in development
bun run typecheck    # Type check
```

## Commands

| Command | Description |
|---------|-------------|
| `simbl` | Interactive TUI menu |
| `simbl init` | Initialize `.simbl/` in current directory |
| `simbl add <title>` | Add a new task |
| `simbl list` | List all tasks |
| `simbl show <id>` | Show task details |
| `simbl done <id>` | Mark task as done |
| `simbl cancel <id>` | Mark task as canceled |
| `simbl tag add/remove` | Manage tags |
| `simbl update <id>` | Update title or content |
| `simbl relate/unrelate` | Manage relationships |
| `simbl serve` | Start web UI |
| `simbl doctor` | Validate tasks.md |
| `simbl usage` | Full command reference |

## Web UI

Start the browser-based interface:

```bash
simbl serve              # Start on port 3497
simbl serve -o           # Start and open browser
simbl serve -p 8080      # Use custom port
```

Features:
- Sortable task table with search and tag filtering
- Inline editing with autosave
- Real-time updates via WebSocket when tasks.md changes
- Works over Tailscale for mobile access

## Task Format

Tasks are stored in `.simbl/tasks.md`:

```markdown
# Backlog

## task-1 Fix login bug

[p1][project:auth]

### Description

Users can't log in with email containing +

# Done

## task-2 Setup CI

[p2]
```

## Tags

| Tag | Meaning |
|-----|---------|
| `[p1]`-`[p9]` | Priority (1 = highest) |
| `[project:name]` | Project grouping |
| `[in-progress]` | Currently being worked on |
| `[canceled]` | Task was canceled |
| `[child-of-task-1]` | Parent relationship |
| `[depends-on-task-2]` | Dependency |

## Integration with Claude Code

After running `simbl init`, a section is added to your `CLAUDE.md`:

```markdown
<!-- SIMBL:BEGIN -->
## SIMBL Backlog

This project uses SIMBL for task management. Run `simbl usage` for all commands.
<!-- SIMBL:END -->
```

### Claude Code Plugin

For deeper integration with Claude Code, install the [backlog-md plugin](https://github.com/yebot/rad-cc-plugins) which provides:

- `/backlog-init` - Initialize or configure SIMBL in your project
- `/board` - View Kanban-style board of tasks
- `/task-create` - Create tasks with full metadata
- `/work` - Start working on a task with guided workflow
- `/task-align` - Sync task status with code changes

Install via Claude Code settings or see the [rad-cc-plugins repository](https://github.com/yebot/rad-cc-plugins) for details.

## License

MIT
