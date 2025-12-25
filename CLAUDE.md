# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev                    # Run CLI in development
bun run src/index.ts <cmd>     # Run specific command
bun run typecheck              # TypeScript type checking
bun run test                   # Run test suite
bun run build                  # Compile to macOS ARM binary (dist/simbl)
bun run build:x64              # Compile to macOS Intel binary (dist/simbl-x64)
bun run build-and-install      # Build and copy to /usr/local/bin
```

## Architecture

SIMBL is a CLI backlog manager that stores tasks in a structured markdown file.

### Core Modules

- **src/index.ts** - Entry point using citty for command routing. No subcommand = TUI mode (planned), subcommand = run that command.
- **src/core/task.ts** - Task type definitions and tag parsing. Tags use bracket notation `[tag]` with reserved tags for priority (`[p1]`-`[p9]`), relationships (`[child-of-X]`, `[depends-on-X]`), and status (`[in-progress]`, `[canceled]`, `[refined]`).
- **src/core/config.ts** - YAML config handling. Walks up directory tree to find `.simbl/` folder. Default prefix is "task" for IDs like `task-1`.
- **src/cli/commands/** - One file per command using citty's `defineCommand`.
- **src/web/** - HTMX-powered browser UI. `server.ts` is a Bun HTTP server with WebSocket for live updates when tasks.md changes. `templates.ts` renders HTML components.

### Data Model

Tasks live in `.simbl/tasks.md` with this structure:

```markdown
# Backlog

## task-1 Title here

[p1][project:auth]

### Description

Content...

# Done

## task-2 Completed task

[p2]
```

- H1 = sections (only "Backlog" and "Done")
- H2 = task ID + title
- Line starting with `[` after H2 = tags
- H3+ = task content sections

### Markdown Parsing

Uses remark (unified ecosystem) for parsing. The parser must:

1. Preserve exact formatting on round-trip
2. Extract tasks from H1 sections
3. Parse tag lines into structured data
4. Handle arbitrary markdown content within tasks

## TDD Policy

TDD is decided per task. Ask before each implementation whether to use TDD.

## Key Patterns

- Commands are agentic-coding-first: pure one-shot CLI with all args, no interactive prompts in commands
- TUI is reserved for `simbl` with no args (human mode)
- Config and tasks files use `findSimblDir()` to walk up from cwd
- Task IDs are `{prefix}-{n}` with auto-increment
- Always stop the Bun http server when done with todo list.

## Documentation

- [docs/CHANGELOG.md](docs/CHANGELOG.md) - Milestone history (keep updated!)
- [docs/SPEC.md](docs/SPEC.md) - Product specification and requirements
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Implementation roadmap
- [docs/BROWSER_UI_PLAN.md](docs/BROWSER_UI_PLAN.md) - Web UI architecture plan
- [docs/BROWSER_UI_RESEARCH.md](docs/BROWSER_UI_RESEARCH.md) - Browser UI technology research
- [docs/TESTING.md](docs/TESTING.md) - Testing strategy and guidelines

**Changelog Policy**: After completing significant features or milestones, add a brief entry to `docs/CHANGELOG.md`. Group by date, one line per feature. Only notable user-facing changes.

<!-- SIMBL:BEGIN -->

## SIMBL Backlog

This project uses SIMBL for task management. Run `simbl usage` for all commands. Tasks have a custom prefix: `smb-`.

**Data files** (in `.simbl/`):

- `tasks.md` - active backlog and done tasks
- `tasks-archive.md` - archived tasks
- `config.yaml` - project configuration

**Common commands** (use `--json` for structured output):

- `simbl list --json` - list all tasks
- `simbl show <id> --json` - get task details
- `simbl add "title" --json` - add a task
- `simbl done <id> --json` - mark task complete
- `simbl update <id> --append "..." --json` - update task

**IMPORTANT:** Always use `--json` flag for reliable parsing. When working on a task, proactively update its description with discoveries, surprises, course-corrections, or architectural decisions. Example:

```bash
simbl update smb-1 --append "### Notes\nDiscovered that X requires Y..." --json
```

<!-- SIMBL:END -->

## Design

Use [this page](https://icon.kitchen/i/H4sIAAAAAAAAA02QS04DMQyGr1KZbRctdGbK7BASLEHQHWKRNM40Io8qkwGqUc%2FCkhNwL46A7dKqWfn34%2FMfj%2FCu%2FIA9tCMYld9WGwwIrVW%2BxynYbrXbkoSCnwVEc9DC79f3j%2Bi7FEmPYFVwfkeVm6fJQ8TJs4o9NejkzYnmivJu%2FS%2F3VDzS18mnLLhHZNL2kI7n00hu25DOzjUqZQUDrFHK1kB3WdlHB6sCG1O2IvralljQ2BJXXKqrquZpFTsPO1eVDJ%2FKw6obq2tccnO5atDpp6RW5Tp2GrvgvZcZn2aumoarRfyg3MSPaDZkMzg%2BcQvtNXk5Ax1usT3%2BUANr%2Fs%2FitmewIUBAAA%3D) to make this app's icon.
