# SIMBL Implementation Plan

## Stack

| Component     | Choice           | Rationale                                            |
| ------------- | ---------------- | ---------------------------------------------------- |
| Runtime       | Bun              | Single-binary distribution via `bun build --compile` |
| Language      | TypeScript       | Type safety for markdown/YAML parsing                |
| CLI Framework | citty            | Modern, Bun-friendly, lightweight (~10KB)            |
| TUI           | @clack/prompts   | Beautiful interactive prompts                        |
| Markdown      | remark (unified) | Robust parsing, preserves formatting on round-trip   |
| Config        | js-yaml          | Standard YAML parsing                                |
| Target        | macOS            | Initial target platform                              |

## Project Structure

```
simbl/
├── src/
│   ├── index.ts              # entry point, command router
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts       # create .simbl/ structure
│   │   │   ├── add.ts        # add new task
│   │   │   ├── list.ts       # list/query tasks
│   │   │   ├── update.ts     # modify task title/content
│   │   │   ├── tag.ts        # add/remove tags
│   │   │   ├── relate.ts     # parent/child, depends-on
│   │   │   ├── done.ts       # mark task done
│   │   │   ├── doctor.ts     # validate tasks.md
│   │   │   └── usage.ts      # help documentation
│   │   └── tui/
│   │       ├── menu.ts       # main TUI entry (`simbl` with no args)
│   │       └── archive.ts    # select done tasks to archive
│   ├── core/
│   │   ├── parser.ts         # remark-based SIMBL parser
│   │   ├── writer.ts         # serialize Tasks back to markdown
│   │   ├── task.ts           # Task type definitions
│   │   └── config.ts         # YAML config handling
│   └── utils/
│       ├── id.ts             # ID generation (prefix + auto-increment)
│       └── validation.ts     # doctor validation rules
├── package.json
├── tsconfig.json
└── bunfig.toml
```

## Commands Reference

### Core Commands

| Command             | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `simbl`             | Launch interactive TUI menu                                                    |
| `simbl init`        | Interactive setup: create `.simbl/`, optionally add SIMBL section to CLAUDE.md |
| `simbl add <title>` | Add new task to Backlog with auto-generated ID                                 |
| `simbl list`        | List all tasks (Backlog by priority DESC, Done by ID DESC)                     |
| `simbl usage`       | Display all commands, arguments, and examples                                  |
| `simbl doctor`      | Validate tasks.md structure and offer fixes                                    |

### Query Flags (for `simbl list`)

| Flag                | Example                     | Description               |
| ------------------- | --------------------------- | ------------------------- |
| `--tag <tag>`       | `simbl list --tag p1`       | Filter by tag             |
| `--project <name>`  | `simbl list --project auth` | Filter by project         |
| `--search <term>`   | `simbl list --search login` | Search titles and content |
| `--status <status>` | `simbl list --status done`  | Filter by status          |

### Task Modification

| Command                           | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `simbl done <id>`                 | Move task to Done section                         |
| `simbl cancel <id>`               | Add [canceled] tag to task                        |
| `simbl update <id> --title <new>` | Update task title                                 |
| `simbl update <id> --content`     | Update task content (opens editor or reads stdin) |

### Tag Management

| Command                       | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `simbl tag add <id> <tag>`    | Add tag to task (e.g., `simbl tag add task-1 p1`) |
| `simbl tag remove <id> <tag>` | Remove tag from task                              |

### Relationships

| Command                                     | Description                 |
| ------------------------------------------- | --------------------------- |
| `simbl relate <id> --parent <parent-id>`    | Set task as child of parent |
| `simbl relate <id> --depends-on <dep-id>`   | Add dependency              |
| `simbl unrelate <id> --parent`              | Remove parent relationship  |
| `simbl unrelate <id> --depends-on <dep-id>` | Remove specific dependency  |

## Implementation Phases

### Phase 1: Foundation ✓

- [x] Initialize Bun project with TypeScript config
- [x] Install dependencies: citty, @clack/prompts, remark, js-yaml
- [x] Create project structure (src/, cli/, core/, utils/)
- [x] Implement `simbl init` command (basic)
- [x] Create config.yaml schema and loader
- [x] Create Task type definitions
- [x] Enhance `simbl init` with interactive CLAUDE.md integration

### Phase 2: Markdown Parser ✓

- [x] Set up remark pipeline (remark-parse, remark-stringify)
- [x] Parse SIMBL structure:
  - H1 sections (Backlog, Done)
  - H2 task headings (ID + title)
  - Tag lines (brackets notation)
  - H3+ content sections
- [x] Create Task type with all fields
- [x] Implement round-trip: parse → modify → write (preserving formatting)
- [x] Ensure markdown files make use of line-spacing for legibility
- [x] Create ID generation utility (src/utils/id.ts)

line-spacing example:

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

### Phase 3: Core Commands ✓

- [x] `simbl list` with default grouping and sorting
- [x] `simbl list` filters: --tag, --project, --search, --status, --json
- [x] `simbl add` with ID generation
- [x] `simbl usage` help system
- [x] `simbl doctor` with validation rules

### Phase 4: Task Modification & Context-Friendly Output ✓

Context optimization (agentic-friendly defaults):

- [x] `simbl list` - default to brief output (one line per task, no content)
- [x] `simbl list --full` - show all tasks with full content (bird's eye view)
- [x] `simbl list --ids` - show only task IDs (minimal context)
- [x] `simbl show <id>` - show one task's full details

Task modification:

- [x] `simbl done <id>` - move task to Done section
- [x] `simbl cancel <id>` - add [canceled] tag
- [x] `simbl tag add <id> <tag>` - add tag to task
- [x] `simbl tag remove <id> <tag>` - remove tag from task
- [x] `simbl update <id> --title <new>` - update task title
- [x] `simbl update <id> --content` - update task content

### Phase 5: Relationships ✓

- [x] Parent-child: `simbl relate --parent`
- [x] Dependencies: `simbl relate --depends-on`
- [x] `simbl unrelate` to remove relationships
- [x] Validation (no circular dependencies)
- [ ] Cascade behavior (parent changes affect children) - deferred

### Phase 6: TUI ✓

- [x] Main menu (`simbl` with no args)
- [x] Archive flow (multi-select done tasks)
- [x] Task summary display
- [x] Interactive add task flow
- [x] Interactive mark done flow

### Phase 7: Build & Distribution

- [ ] `bun build --compile --target=bun-darwin-arm64`
- [ ] Binary naming and versioning
- [ ] Installation instructions

### Phase 8: finalize, documentation

- [ ] add a note to the top of this plan file to inform future instances of agentic coding tools that this was completed on a specific date and should be considered a historical record.
- [ ] Provide the human owner of this project a readme that describes how to perform HITL testing of SIMBL.

## Type Definitions

```typescript
interface Task {
  id: string; // e.g., "task-1", "abc-42"
  title: string; // text after ID in H2
  tags: string[]; // all tags including reserved
  priority?: number; // 1-9 from [p1]-[p9]
  project?: string; // from [project:xxx]
  parentId?: string; // from [child-of-xxx]
  dependsOn: string[]; // from [depends-on-xxx]
  status: TaskStatus;
  content: string; // raw markdown (H3+ sections)
  position: {
    // for AST manipulation
    start: number;
    end: number;
  };
}

type TaskStatus = "backlog" | "in-progress" | "done" | "canceled";

interface Config {
  prefix: string; // default: "task"
}
```

## Config Schema

```yaml
# .simbl/config.yaml
prefix: "task" # Task ID prefix (task-1, task-2, ...)
```

## Validation Rules (doctor)

1. Only two H1 headings: "Backlog" and "Done"
2. H2 headings must start with valid task ID
3. Tag line must immediately follow H2 (if present)
4. Priority tags: only one [p1]-[p9] per task
5. Reserved tags use correct format
6. Task sections start at H3 level
7. No orphaned child references (parent must exist)
8. No circular dependencies

## ID Generation Logic

1. Read config.yaml for prefix (default: "task")
2. Scan all existing task IDs in tasks.md and tasks-archive.md
3. Extract numeric suffix, find max
4. New ID = prefix + "-" + (max + 1)
5. If prefix changes in config, prompt: "Update all existing task IDs? (y/n)"

## CLAUDE.md Integration

The `simbl init` command is always interactive and integrates with Claude Code:

### Flow

```
$ simbl init

✓ Created .simbl/config.yaml
✓ Created .simbl/tasks.md
✓ Created .simbl/tasks-archive.md

◆ Found CLAUDE.md in project root.
│ Add SIMBL usage instructions? (Y/n)
└
✓ Added SIMBL section to CLAUDE.md
```

If no CLAUDE.md exists:

```
◆ No CLAUDE.md found.
│ Create one with SIMBL instructions? (Y/n)
└
✓ Created CLAUDE.md with SIMBL section
```

### CLAUDE.md Section Content

```markdown
<!-- SIMBL:BEGIN -->

## SIMBL Backlog

This project uses SIMBL for task management. Run `simbl usage` for all commands.

Common commands:

- `simbl list` - view all tasks
- `simbl add "title"` - add a task
- `simbl done <id>` - mark task complete
<!-- SIMBL:END -->
```

The section is wrapped in `<!-- SIMBL:BEGIN -->` and `<!-- SIMBL:END -->` XML comments for clear boundary detection. Prominently features `simbl usage` so Claude Code can learn all available commands dynamically.
