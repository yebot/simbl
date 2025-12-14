# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev                    # Run CLI in development
bun run src/index.ts <cmd>     # Run specific command
bun run typecheck              # TypeScript type checking
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

## Key Patterns

- Commands are agentic-coding-first: pure one-shot CLI with all args, no interactive prompts in commands
- TUI is reserved for `simbl` with no args (human mode)
- Config and tasks files use `findSimblDir()` to walk up from cwd
- Task IDs are `{prefix}-{n}` with auto-increment
- Always stop the Bun http server when done with todo list.

## Documentation

- [docs/SPEC.md](docs/SPEC.md) - Product specification and requirements
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Implementation roadmap
- [docs/BROWSER_UI_PLAN.md](docs/BROWSER_UI_PLAN.md) - Web UI architecture plan
- [docs/BROWSER_UI_RESEARCH.md](docs/BROWSER_UI_RESEARCH.md) - Browser UI technology research
- [docs/TESTING.md](docs/TESTING.md) - Testing strategy and guidelines

<!-- SIMBL:BEGIN -->

## SIMBL Backlog

This project uses SIMBL for task management. Run `simbl usage` for all commands.

Common commands:

- `simbl list` - view all tasks
- `simbl add "title"` - add a task
- `simbl done <id>` - mark task complete
<!-- SIMBL:END -->

## Design

Use [this page](https://icon.kitchen/i/H4sIAAAAAAAAA02QS04DMQyGr1KZbRctdGbK7BASLEHQHWKRNM40Io8qkwGqUc%2FCkhNwL46A7dKqWfn34%2FMfj%2FCu%2FIA9tCMYld9WGwwIrVW%2BxynYbrXbkoSCnwVEc9DC79f3j%2Bi7FEmPYFVwfkeVm6fJQ8TJs4o9NejkzYnmivJu%2FS%2F3VDzS18mnLLhHZNL2kI7n00hu25DOzjUqZQUDrFHK1kB3WdlHB6sCG1O2IvralljQ2BJXXKqrquZpFTsPO1eVDJ%2FKw6obq2tccnO5atDpp6RW5Tp2GrvgvZcZn2aumoarRfyg3MSPaDZkMzg%2BcQvtNXk5Ax1usT3%2BUANr%2Fs%2FitmewIUBAAA%3D) to make this app's icon.

<!-- BRANCH-WORKFLOW-ENABLED -->
<!-- WORKTREE-MODE -->
## Branch-Based Workflow (Worktree Mode)

This project uses a worktree-based development workflow. Each feature gets its own directory, allowing parallel development without branch switching.

### Branch Strategy

- **Protected branches**: `main`, `master` - never commit directly
- **Feature branches**: Create via worktrees from main
- **Branch naming**: Use prefixes like `feat/`, `fix/`, `refactor/`, `docs/`

### Worktree Workflow

1. **Start new work**: Create a worktree for the feature
   ```bash
   # From main repo directory
   git fetch origin
   git worktree add ../$(basename $PWD)-feat-name -b feat/feature-name origin/main
   cd ../$(basename $PWD)-feat-name
   ```

2. **Make commits**: Work in the worktree directory
   ```bash
   git add .
   git commit -m "feat: description of change"
   ```

3. **Stay in sync**: Periodically rebase on main (hooks will remind you)
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push and create PR**: When ready for review
   ```bash
   git push -u origin feat/feature-name
   gh pr create --title "feat: your feature" --body "Description..."
   ```

5. **After merge**: Clean up worktree and branch
   ```bash
   cd /path/to/main/repo
   git worktree remove ../$(basename $PWD)-feat-name
   git branch -d feat/feature-name
   git pull origin main
   ```

### Worktree Management

```bash
# List all worktrees
git worktree list

# Create worktree for existing remote branch (e.g., PR review)
git worktree add ../project-review origin/feat/some-branch

# Remove worktree when done
git worktree remove ../project-review

# Prune stale worktree references
git worktree prune
```

### Directory Structure

Keep worktrees alongside the main repo:
```
~/projects/
├── myproject/              <- main branch (primary repo)
├── myproject-feat-auth/    <- feature worktree
├── myproject-fix-bug/      <- bugfix worktree
└── myproject-review/       <- PR review worktree
```

### Task Tracker Integration

When working on tracked tasks:
- Reference task IDs in branch names: `feat/TASK-123-add-feature`
- Include task references in commit messages: `feat: add feature [TASK-123]`
- Link PRs to tasks in the PR description
- Update task status when PR is merged

### Configuration

- **Sync reminder threshold**: Set `BRANCH_SYNC_HOURS` env var (default: 2 hours)
- **Disable workflow**: Run `/toggle-branch-workflow` to turn off

<!-- /BRANCH-WORKFLOW-ENABLED -->
