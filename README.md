# SIMBL - Simple Backlog

A CLI task manager for dev projects. Optimized for agentic coding tools (Claude Code, Cursor, etc.) with an interactive TUI for humans.

## Features

- **Markdown-based** - Tasks stored in `.simbl/tasks.md`, human-readable and version-controllable
- **Agentic-friendly** - Brief CLI output by default, one-shot commands for automation
- **Interactive TUI** - Run `simbl` with no args for a menu-driven interface
- **Relationships** - Parent-child tasks and dependencies with cycle detection
- **Tags** - Priority (`[p1]`-`[p9]`), projects (`[project:auth]`), and custom tags

## Installation

### From Source (requires Bun)

```bash
# Clone and build
git clone https://github.com/yebot/simbl.git
cd simbl
bun install
bun run build

# Copy to your PATH
cp dist/simbl /usr/local/bin/
```

### Development

```bash
bun install
bun run dev          # Run CLI
bun run typecheck    # Type check
```

## Quick Start

```bash
# Initialize in your project
simbl init

# Add tasks
simbl add "Fix login bug" -p 1
simbl add "Add dark mode" --project ui

# View tasks
simbl list                    # Brief output (default)
simbl list --full             # With content
simbl show task-1             # Single task details

# Manage tasks
simbl done task-1             # Mark as done
simbl tag add task-2 urgent   # Add tag
simbl relate task-3 --parent task-1  # Set parent

# Interactive mode
simbl                         # Launch TUI menu
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
| `simbl doctor` | Validate tasks.md |
| `simbl usage` | Full command reference |

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

## License

MIT
