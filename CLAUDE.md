# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev                    # Run CLI in development
bun run src/index.ts <cmd>     # Run specific command
bun run typecheck              # TypeScript type checking
bun run build                  # Compile to macOS binary (dist/simbl)
```

## Architecture

SIMBL is a CLI backlog manager that stores tasks in a structured markdown file.

### Core Modules

- **src/index.ts** - Entry point using citty for command routing. No subcommand = TUI mode (planned), subcommand = run that command.
- **src/core/task.ts** - Task type definitions and tag parsing. Tags use bracket notation `[tag]` with reserved tags for priority (`[p1]`-`[p9]`), relationships (`[child-of-X]`, `[depends-on-X]`), and status (`[in-progress]`, `[canceled]`, `[refined]`).
- **src/core/config.ts** - YAML config handling. Walks up directory tree to find `.simbl/` folder. Default prefix is "task" for IDs like `task-1`.
- **src/cli/commands/** - One file per command using citty's `defineCommand`.

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

## Key Patterns

- Commands are agentic-coding-first: pure one-shot CLI with all args, no interactive prompts in commands
- TUI is reserved for `simbl` with no args (human mode)
- Config and tasks files use `findSimblDir()` to walk up from cwd
- Task IDs are `{prefix}-{n}` with auto-increment
