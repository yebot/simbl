# Backlog

## smb-23 Add production building for Windows and Linux

[needs-refinement][project:core][on-ice]

***

task-log

- 2025-12-20T17:41:00Z | Added tag [on-ice]
- 2025-12-20T17:40:56Z | Removed priority [p5]

## smb-25 Consolidate inline styles into CSS classes in web UI

[depends-on-smb-24][project:web][on-ice]

### Description

#### Overview

Extract ~50 inline style attributes from templates.ts and page.ts into proper CSS classes.

#### Scope

- Audit inline styles in src/web/templates.ts and src/web/page.ts
- Create CSS classes for repeated patterns (priority colors, status colors, button styles)
- Replace inline style="..." with class="..."
- Keep dynamic values that truly need to be inline

#### Benefits

- Cleaner template code
- Easier theming/dark mode support
- Better maintainability

#### Depends on

smb-24 (template tag refactor should be done first)

***

task-log

- 2025-12-20T17:41:14Z | Added tag [on-ice]
- 2025-12-20T17:41:07Z | Removed priority [p3]
- 2025-12-20T03:17:10Z | Priority set to [p3]

## smb-26 Add automated XSS prevention tests for web UI

[depends-on-smb-24][project:web][on-ice]

### Description

#### Overview

Add tests to verify XSS prevention in web UI templates.

#### Scope

- Test that user input is properly escaped in HTML output
- Test that malicious script tags are escaped
- Test edge cases (quotes, angle brackets, unicode)
- Verify `$${}` usages only contain trusted HTML

#### Test Cases

- Task titles with `<script>` tags
- Task descriptions with event handlers (onclick, onerror)
- Tag names with special characters
- Markdown content with embedded HTML

#### Depends on

smb-24 (template tag refactor should be done first)

***

task-log

- 2025-12-20T17:41:27Z | Added tag [on-ice]
- 2025-12-20T17:41:23Z | Removed priority [p3]
- 2025-12-20T03:17:14Z | Priority set to [p3]

## smb-37 Add simbl sync command for pulling remote task changes

[depends-on-smb-36][project:mobile-capture][on-ice]

### Description

#### Overview

A command that pulls remote changes and reports what's new in tasks.md. Complements the GitHub workflow_dispatch quick-capture feature.

#### Behavior

```bash
simbl sync
### Pulling from origin...
### 2 new tasks from remote: smb-37, smb-38
### 1 task updated: smb-12
```

#### Implementation

1. Run `git pull` (or `git fetch` + `git merge`)
2. Compare tasks.md before/after
3. Report: new tasks, updated tasks, deleted tasks
4. Handle merge conflicts gracefully (show conflict, don't crash)

#### Edge cases

- No remote configured → skip with message
- Conflicts in tasks.md → show warning, let user resolve
- No changes → 'Already up to date'
- Dirty working tree → warn but proceed (or require clean?)

***

task-log

- 2025-12-20T17:40:44Z | Added tag [on-ice]
- 2025-12-20T17:40:33Z | Removed priority [p4]

## smb-36 Add GitHub workflow_dispatch for mobile task capture

[project:mobile-capture][on-ice]

### Description

#### Overview

Add a GitHub Actions workflow that allows quick task capture from the GitHub mobile app via workflow_dispatch. User triggers the workflow manually, enters task title, and it commits directly to tasks.md.

#### Implementation

1. Create `.github/workflows/simbl-quick-add.yml` workflow file
2. Use workflow_dispatch with text input for task title
3. Parse tasks.md, add new task to Backlog section
4. Auto-increment task ID based on existing tasks
5. Commit and push the change

#### Workflow inputs

- `title` (required): Task title
- `priority` (optional): p1-p9
- `project` (optional): project name
- `content` (optional): task description

#### Mobile UX

1. Open GitHub mobile app
2. Go to repo → Actions → Quick Add Task
3. Tap 'Run workflow'
4. Enter task title (and optional fields)
5. Tap 'Run'
6. Task appears in tasks.md on next pull

#### Technical notes

- Workflow needs write permissions to commit
- Must handle concurrent runs (use git pull before push)
- Parse existing task IDs to find next available number
- Consider adding a special tag to these tasks so, once imported, we can give it special consideration
- Use the prefix from config.yaml if accessible, or derive from existing task IDs, or default to 'task'

***

task-log

- 2025-12-20T17:41:37Z | Added tag [on-ice]
- 2025-12-20T17:41:32Z | Removed priority [p4]

## smb-57 Discovery:

[p2][web]

How would we go about adding URL scheme to SIMBL web? how difficult would it be?

example:

http://localhost:3277/ -> shows the main list
http://localhost:3277/task-34 -> shows the main list with task-34 modal open
http://localhost:3277/new -> shows the main list with new task creation modal open

***

task-log

- 2025-12-21T19:45:55Z | Task created

# Done

## smb-55 Discovery: moving logging to a separate file

[p1][core][logging][refined]

my initial idea of adding log entries to the content of every task is problematic I think. file bloat and accidental corruption are concerns.

moving the logs to a unified, .simbl/log.md file might be a better overall design.

Discover what it would take to make this change.

***

#### Discovery Findings

##### Current Implementation Analysis

**Where logs are stored:** Embedded in task content (`task.content`) after a `***\n\ntask-log\n` marker.

**Core log module:** `src/core/log.ts` (241 lines)

- `parseTaskLog()` - extracts log entries from task content
- `appendLogEntry()` - adds new entry to task content
- `appendOrBatchLogEntry()` - batches identical messages within 30 min window
- `stripTaskLog()` - removes log section from content

**Files that call logging functions:**
| File | Functions Used | Purpose |
|------|----------------|---------|
| `src/cli/commands/add.ts` | `appendLogEntry` | Task created |
| `src/cli/commands/done.ts` | `appendLogEntry` | Moved to Done |
| `src/cli/commands/cancel.ts` | `appendLogEntry` | Marked canceled |
| `src/cli/commands/tag.ts` | `appendLogEntry` | Tag add/remove, priority changes |
| `src/cli/commands/update.ts` | `appendOrBatchLogEntry` | Title/content changes |
| `src/cli/commands/log.ts` | `parseTaskLog` | Display log entries |
| `src/web/server.ts` | Both | All web UI mutations |
| `src/web/templates.ts` | `parseTaskLog` | Render log in modal |

##### Current Scale

- **tasks.md**: 2,321 lines
- **Tasks with logs**: ~52 task-log sections
- **Total tasks**: 49 tasks

##### Pros/Cons of Current Approach

**Pros:**

- Simple - logs live with their task
- Self-contained - task + history in one place
- No additional files to manage

**Cons:**

- File bloat over time
- Corruption risk - parsing task content is fragile
- Can't query logs across tasks easily
- Log section interferes with task content editing

***

#### Proposed Design: Centralized Log File

##### File Format Options

| Format | Pros | Cons |
|--------|------|------|
| **Markdown (.md)** | Human-readable, git-diffable | Parsing complexity |
| **NDJSON (.ndjson)** | Easy parsing, append-only | Less human-readable |
| **YAML** | Readable, structured | Harder to append |

**Recommendation:** NDJSON (`.simbl/log.ndjson`)

```json
{"taskId":"smb-55","timestamp":"2025-12-20T18:49:44Z","event":"content_updated"}
{"taskId":"smb-55","timestamp":"2025-12-20T18:47:00Z","event":"task_created"}
```

**Why NDJSON:**

- Append-only writes (no file rewrite)
- Fast parsing (line-by-line)
- Can add rich metadata (user, before/after values)
- Easy filtering with grep/jq

##### Migration Strategy

1. **Detection**: Check if task content contains `***\n\ntask-log\n`
2. **One-time migration**:
   - Scan all tasks on first log operation
   - Extract log entries from each task
   - Write to `.simbl/log.ndjson`
   - Strip log sections from tasks
   - Write updated tasks.md
3. **Version flag**: Add `logVersion: 2` to config.yaml after migration

##### Changes Required

| Component | Changes |
|-----------|---------|
| `src/core/log.ts` | Rewrite to use external file |
| `src/core/config.ts` | Add log file path, version detection |
| CLI commands (6 files) | Update imports, remove content manipulation |
| `src/web/server.ts` | Update to new log API |
| `src/web/templates.ts` | Read from log file instead of task content |
| New: `src/core/migrate.ts` | Migration logic |

##### Effort Estimate

- **Core log rewrite**: Medium (new file I/O, queries)
- **CLI updates**: Low (just change function calls)
- **Web updates**: Medium (server + templates)
- **Migration**: Medium (need careful testing)
- **Total**: ~8-12 subtasks

##### New Capabilities

With centralized logs we could add:

- `simbl log` (no ID) - show all recent activity
- `simbl log --since "2d"` - filter by time
- Structured events (not just messages)
- Before/after values for changes

***

#### Recommendation

**Proceed with centralized NDJSON logging.** The migration is manageable and provides:

1. Cleaner task content
2. Better performance at scale
3. Foundation for richer activity features

**Next step:** Create implementation subtasks for this work.
***

task-log

- 2025-12-22T08:56:38Z | Moved to Done
- 2025-12-22T08:56:33Z | Added tag [refined]
- 2025-12-22T08:56:24Z | Content updated
- 2025-12-20T18:49:44Z | Content updated
- 2025-12-20T18:47:00Z | Task created

## smb-58 add help command flag

[p1][cli]

adding `-h` or `--help` to a command should make simbl cli explain itself.

Does it make sense to have `simbl -h` and `simbl usage` show the same result?

##### Implementation Notes

Fixed in src/index.ts by adding detection for help/version flags (`-h`, `--help`, `--version`) before the TUI check. These flags now correctly route to citty's runMain() instead of launching the TUI.

Note: `-v` is not supported by citty as a short form of `--version` (shows help with error instead). Only `--version` works.

***

task-log

- 2025-12-22T08:39:58Z | Moved to Done
- 2025-12-22T08:39:58Z | Content updated

## smb-54 Disable GIthub Actions

[p1][cicd]

***

task-log

- 2025-12-20T17:42:28Z | Moved to Done
- 2025-12-20T04:02:48Z | Task created

## smb-53 Confirmations should use PicoCSS Modal

[p1][web]

Clicking 'Archive' should use PicoCSS modal

Clicking 'Cancel' should use PicoCSS modal

https://picocss.com/docs/modal

***

task-log

- 2025-12-20T03:34:32Z | Moved to Done
- 2025-12-20T03:23:35Z | Task created

## smb-39 Show status badges for all relation links in task modal

[p2][web][ui][refined]

In the task modal Relations section, show status badges (in-progress, done, canceled) next to all relation links:

- **Children** - tasks with `[child-of-smb-39]`
- **Parent** - the parent task if this task has `[child-of-X]`
- **Dependencies** - tasks listed in `[depends-on-X]`

##### Implementation

1. Create `getChildStatusBadge(status)` helper in `templates.ts` (smaller variant of existing `getStatusBadge()`)

2. Modify `renderTaskModal()` to append badge after each relation link:

   - Children loop (~line 543)
   - Parent link (~line 510)
   - Dependencies loop (~line 530)

3. Use existing CSS variables:

   - `var(--simbl-in-progress-bg)` - blue/cyan
   - `var(--simbl-done-bg)` - green
   - `var(--pico-color-red-550)` - red for canceled

4. Badge styling: `font-size: 0.75em`, `padding: 2px 6px`, `margin-left: 0.5em`

##### Files to Modify

- `src/web/templates.ts`

##### Acceptance Criteria

- [ ] Children with `[in-progress]` tag show "in-progress" badge
- [ ] Children in Done section show "done" badge
- [ ] Children with `[canceled]` tag show "canceled" badge
- [ ] Backlog children show no badge
- [ ] Parent link shows status badge
- [ ] Dependency links show status badges
- [ ] Badge uses same color scheme as task row badges
- [ ] Badge has `aria-label` for accessibility
- [ ] Badge does not break layout on mobile
- [ ] Clicking relation link still opens that task's modal

***

task-log

- 2025-12-20T03:21:03Z | Moved to Done

## smb-52 Bug: Canceling a task in both CLI and Web should also move it to Done

[p1][bug]

***

task-log

- 2025-12-20T03:19:01Z | Moved to Done
- 2025-12-20T03:16:00Z | Task created

## smb-51 Task IDs in Archive duplication prevention

[p1]

When a task is moved to archive, its task ID no longer appears in the Backlog or Done sections. Because of this, newly added tasks can be assigned a task ID that already exists in the archive which can lead to a collision of IDs.

When a new tasks is created, there should be a check on all IDs in BOTH files to ensure no duplicate IDs are created.

***

task-log

- 2025-12-20T03:18:29Z | Moved to Done
- 2025-12-20T03:04:44Z | Task created

## smb-15 Add 'No Project' filter to web UI

[p2][feature][canceled][canceled]

### Description

The filter section above the table should have a button that only shows tasks that do not belong to a project.

***

task-log

- 2025-12-20T03:16:14Z | Marked as canceled

## smb-8 Fix CLI cancel to move task to Done section

[p1][cli][refined]

The CLI cancel command exists but does not move tasks to the Done section. Fix this behavior.

#### Requirements

- `simbl cancel <id>` should add `[canceled]` tag (already works)
- `simbl cancel <id>` should move task from Backlog to Done section (needs fix)
- `simbl cancel <id>` should remove `[in-progress]` tag if present (already works)
- Only backlog and in-progress tasks can be canceled (done tasks cannot)

#### Acceptance Criteria

- [ ] Running `simbl cancel <id>` on a backlog task moves it to Done section
- [ ] Running `simbl cancel <id>` on an in-progress task moves it to Done section
- [ ] Running `simbl cancel <id>` on a done task returns an error
- [ ] The `[canceled]` tag is added to the task
- [ ] The `[in-progress]` tag is removed if present
- [ ] Exit code 0 on success, exit code 1 on error

#### Implementation Notes

Mirror the pattern from `done.ts` (lines 45-57) for moving tasks between sections. Also add validation to reject canceling already-done tasks.

***

task-log

- 2025-12-20T03:13:12Z | Moved to Done

## smb-40 Updates to CLAUDE.md snippet

[p1][claude.md]

update `const CLAUDE_MD_SECTION`:

1. give it knowledge of the file path location of `tasks.md`, `config.yaml`, `tasks-archive.md`
2. add an IMPORTANT instruction to always proactively update task descriptions when new information, surprises, course-corrections or architectural decisions are made. And, provide an example CLI command that does this.

***

task-log

- 2025-12-20T03:09:40Z | Moved to Done

## smb-41 the CLAUDE.md init update should mention task ID format

[p2][init]

if the config has a custom prefix, CLAUDE.md should inform accordingly, if no prefix specified in config, default 'task-' prefix should be mentioned.

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-42 inti wizard should ask if the user wants to specify a custom port

[p1][init]

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-43 Expand implementation of json output flag

[p1][cli][json]

For every CLI command that an agentic AI tool might run on SIMBL, there should be an option to have SIMBL respond with JSON.

##### Implementation Notes\nAdded --json flag to: done, cancel, update, relate, unrelate, tag add, tag remove

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-49 Test task for logging

[feature][p2]

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done
- 2025-12-17T22:38:32Z | Moved to Done
- 2025-12-17T22:38:27Z | Priority changed from [p1] to [p2]
- 2025-12-17T22:38:23Z | Added tag [feature]
- 2025-12-17T22:37:51Z | Task created

## smb-47 Task log: auto-generate on mutations

[p2][project:core][child-of-smb-28][depends-on-smb-46]

### Description

##### Overview

Hook into all task mutation points to automatically generate log entries using the parser from smb-46.

##### Mutation Points to Hook

| Change Type | Location | Log Message Format |
|-------------|----------|-------------------|
| Task created | add.ts, server.ts POST /task | "Task created" |
| Status: done | done.ts, server.ts | "Moved to Done" |
| Status: in-progress | server.ts | "Marked in-progress" |
| Status: backlog | server.ts | "Moved to Backlog" |
| Status: canceled | cancel.ts, server.ts | "Marked as canceled" |
| Priority change | server.ts | "Priority changed from P{old} to P{new}" |
| Tag added | tag.ts, server.ts | "Added tag [{tag}]" |
| Tag removed | tag.ts, server.ts | "Removed tag [{tag}]" |
| Title changed | update.ts, server.ts | "Title updated" (batch within 30 min) |
| Content changed | update.ts, server.ts | "Content updated" (batch within 30 min) |

##### CLI Command

Add `simbl log <id>` command:

- Displays log entries for a task
- Supports `--json` flag for machine output
- Shows newest entries first (or oldest first, TBD)

Update `simbl usage` with log command documentation.

##### Implementation Notes

- Use `appendOrBatchLogEntry()` for title/content changes to batch within 30 min
- Use `appendLogEntry()` for status/tag/priority changes (no batching)
- Priority changes should capture before/after values

##### Acceptance Criteria

- [ ] Task creation generates "Task created" log entry
- [ ] `simbl done` generates log entry
- [ ] `simbl cancel` generates log entry
- [ ] `simbl tag add` generates log entry with tag name
- [ ] `simbl tag remove` generates log entry with tag name
- [ ] `simbl update --title` generates log entry (batched)
- [ ] `simbl update --content` generates log entry (batched)
- [ ] Priority changes via web UI generate log entry with before/after
- [ ] Status changes via web UI generate log entries
- [ ] `simbl log <id>` displays log entries
- [ ] `simbl log <id> --json` outputs JSON format
- [ ] `simbl usage` documents log command
- [ ] TypeScript compiles (`bun run typecheck`)

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-46 Task log: markdown format and parser

[p2][project:core][child-of-smb-28]

### Description

##### Overview

Implement the core parsing layer for task log sections. This is the foundation for the task log feature.

##### Technical Requirements

###### Log Section Format

`````markdown
***

task-log

- 2025-12-20T03:09:39Z | Moved to Done
- 2025-12-17T14:32:00Z | Message here
- 2025-12-17T14:30:00Z | Another message

## smb-45 Acceptance Criteria CLI Additions

[p1][cli]

as an AI user, I should be able to add an acceptance criterion to

All acceptance criteria commands should have logic that looks for or creates a standard acceptance criteria header in the content of a task so it can always be found and be consistent.

The doctor command should verify acceptance criteria headers and formatting.

Example acceptance criteria commands

- `simbl ac add task-1 "All tests pass" ` // adds one acceptance criterion to task-1

- `simbl ac add task-1 "All tests pass" "Background is now red" "Test coverage > 80%" ` // adds multiple acceptance criterion to task-1 (Variadic positional arguments)

- `simbl ac list task-1` // displays all acceptance criteria for task-1 as a numbered list

- `simbl ac meets task-1 1` // updates task-1's acceptance criterion #1 by making it checked `- [x]`

- `simbl ac update task-1 2 "Background is now blue"` // updates task-1's acceptance criterion #2 by changing its description

- `simbl ac fails task-1 3` // updates task-1's acceptance criterion #3 by making it unchecked `- [ ]`

- `simbl ac delete task-1 4` // deletes task-1's acceptance criterion #4

ALL commands when successful should respond with the up-to-date entire list of acceptance criteria. All commands should support adding `--json` so the output is json.

The `simbl usage` command should provide complete instructions on how to us `simbl ac` commands.

### Acceptance Criteria

- [x] All 6 ac subcommands work correctly
- [x] Usage docs updated
- [x] Doctor validates AC format

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-34 Improve *.bun-build file handling

[p1][bun]

1. Config Bun to NOT put *.bun-build files in the root

2. Make sure *.bun-build files are gitignore'd.

***

task-log

- 2025-12-20T03:09:39Z | Moved to Done

## smb-30 Update sorting for the HTMX table of tasks

[web][ui][p1]

1. Always show [done] items unless filtered out by 'in-progress' filter

2. Change the default sort

Sort by header DESC (# Header or # Done) The tasks under `# Header` will come before the tasks under `# Done`
Then by task-ID ASC

3. Change the sort behavior

If the user clicks the ID sort table heading from ASC to DESC,
Sort by header DESC, then by task-ID DESC

If the user clicks the ID sort table heading from DESC to ASC,
Sort by header DESC, then by task-ID ASC

If the user clicks the Task sort table heading from ASC to DESC,
Sort by header DESC, then by Task Title DESC

If the user clicks the Task sort table heading from DESC to ASC,
Sort by header DESC, then by Task Title ASC

FOLLOW UP! There's still default behavior on initial page load that omits [done] tasks

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-28 Add Task Log Feature

[p2][project:core][refined]

##### Overview

Add an automatic changelog/audit trail for individual tasks that records all modifications. Log entries are stored in a designated section of task content, hidden from the user-facing Content textarea but viewable via a toggle in the task modal.

##### Technical Approach

###### Markdown Format

Use horizontal rule + keyword pattern to delineate log section:

````markdown
##### Description
User content here...
***

task-log

- 2025-12-20T03:09:38Z | Moved to Done
- 2025-12-17T23:55:08Z | Title updated
- 2025-12-17T14:32:00Z | Priority changed from P2 to P1
- 2025-12-17T14:30:00Z | Added tag [feature]
- 2025-12-17T14:28:00Z | Task created
- 2025-12-17T23:18:47Z | Moved to Done

## smb-27 Add 'Backlog' Status filter button

[p1][project:web]

### Description

Add a "Backlog" status filter button alongside the existing "In-Progress" and "Done" filters.

### Requirements

- Filter shows tasks that do NOT have `[in-progress]` or `[done]` tags (pure backlog items)
- Clicking a status filter clears any active project filter (mutual exclusivity with project filters)
- Button styling matches existing status filter buttons

### Acceptance Criteria

- [ ] "Backlog" filter button appears in status filter section
- [ ] Clicking "Backlog" shows only tasks without `[in-progress]` or `[done]` tags
- [ ] Clicking "Backlog" clears any active project filter
- [ ] Button uses consistent styling with other status filters

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-22 Simbl plugin: update all commands that accept a task-id argument

[plugin]

For any commands that expects a task ID (task-##) as its argument. If the user supplies only digits, (Ex. "9"), assume they want you to refer to "task-9" (or "abc-9" if the config task prefix is "abc")

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-21 Web UI Task modal: make entire Task ID clickable (to clipboard)

[web][p3][project:web][p5]

- remove the clipboard icon.
- make the entire "badge" clickable.
- inform user it was copied to clipboard.

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-20 Add 'Mark Canceled' button to Web UI task modal

[p1][web][ui][depends-on-smb-8][refined][project:web]

Add a cancel button to the Web UI task modal for backlog and in-progress tasks.

#### Requirements

- Add "Mark Canceled" button in task modal for backlog and in-progress tasks
- Button should use red outline style (matches "Send to Archive" pattern)
- Show confirmation dialog before canceling
- After cancel, task moves to Done section with [canceled] tag
- Canceled tasks appear under "done" filter (no separate filter needed)
- When sending a canceled task back to in-progress, auto-remove the [canceled] tag

#### Acceptance Criteria

- [ ] "Mark Canceled" button appears in task modal for backlog tasks
- [ ] "Mark Canceled" button appears in task modal for in-progress tasks
- [ ] "Mark Canceled" button does NOT appear for done tasks
- [ ] Clicking button shows confirmation: "Mark this task as canceled and move it to Done?"
- [ ] After confirming, task moves to Done section with [canceled] tag
- [ ] Task modal updates to show "canceled" status with red badge
- [ ] Task list updates via WebSocket broadcast
- [ ] Sending canceled task to in-progress removes the [canceled] tag automatically

#### Implementation Notes

##### New endpoint in server.ts

Add POST /task/:id/cancel following the pattern of /task/:id/done (lines 354-376):

```typescript
if (path.match(/^\/task\/[^/]+\/cancel$/) && req.method === "POST") {
  const id = path.split("/")[2];
  // Find task in backlog, add [canceled] tag, move to done
  // Return updated modal HTML
}
`````

##### Button in templates.ts

Add to renderTaskModal() status action row (around line 627-652):

```html
<button
  hx-post="/task/${taskId}/cancel"
  hx-target="#modal-container"
  hx-swap="innerHTML"
  hx-confirm="Mark this task as canceled and move it to Done?"
  class="outline"
  style="padding: 4px 12px; font-size: 0.8em; color: var(--pico-del-color); border-color: var(--pico-del-color);"
>
  Mark Canceled
</button>
```

##### Auto-remove [canceled] on send to in-progress

Modify the /task/:id/in-progress handler to remove the [canceled] tag when present.

##### user reminders

remind them to use this feat on smb-6 and smb-15

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-18 Add auto-complete to new tag input field

[feature][p3][project:web]

Wherever there exists a tag input field, auto-complete functionality should exist where the auto-complete has knowledge of all existing tags in tasks.md as well as reserved special tags so its easier to add tags to a task w/o making mistakes.

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done

## smb-17 Add priority selection UI to the 'Add Task' modal

[p1][feature][web][project:web]

Allow the user to specify which Priority tag to add to a task in the 'Add Task' modal.

This field is optional.

***

task-log

- 2025-12-20T03:09:38Z | Moved to Done
- 2025-12-18T01:00:56Z | Priority changed from [p3] to [p1]
- 2025-12-18T01:00:54Z | Priority changed from [p2] to [p3]

## smb-16 Add webPort config option with serve command warning

[feature][project:web][refined]

##### Description

Add a `webPort` config option to `.simbl/config.yaml` that specifies the preferred port for the web UI. No init prompt - users set this via `--port` flag or manual config edit.

##### Implementation Details

**1. Config Schema** (`src/core/config.ts`)

- Add optional `webPort?: number` to `SimblConfig` interface
- Default value: 3497

**2. Serve Command** (`src/cli/commands/serve.ts`)

- Priority order: CLI `--port` > config `webPort` > default 3497
- Pass preferred port context to server

**3. Server Warning** (`src/web/server.ts`)

- When bound port differs from preferred, warn:
  `Warning: Preferred port 3497 is in use. Starting on port 3498 instead.`

**4. Port Validation**

- Reject ports < 1024 with error (privileged ports)
- Accept ports 1024-65535 only

##### Acceptance Criteria

- [ ] `SimblConfig` interface includes optional `webPort: number` field
- [ ] `simbl serve` reads port from config when no `--port` argument provided
- [ ] CLI `--port` argument overrides config preference
- [ ] Ports < 1024 are rejected with clear error message
- [ ] When actual bound port differs from preferred, a warning is displayed
- [ ] Warning includes both preferred and actual port numbers
- [ ] Default port remains 3497 when not configured

***

task-log

- 2025-12-20T03:09:37Z | Moved to Done

## smb-14 Project UX Refinements

[p1][project:web][refined]

### Requirements

#### 1. Project Filter Behavior

- Clicking a project filter shows tasks from both Backlog AND Done sections
- Clicking a project filter clears any active status filter (and vice versa) - only one filter at a time
- Project filter section is completely hidden when no `[project:xxx]` tags exist in tasks.md

#### 2. Task Modal Layout Changes

- Make Priority selection buttons smaller (match tag badge sizing using `.tag-btn` class)
- Put Priority, Project, and Tags in one horizontal row using flexbox with `flex-wrap: wrap` (collapses on mobile)
- Move action buttons ("Send to...", "Mark...") to right side of Status row using `margin-left: auto`
- Add unicode icons to action buttons while keeping verb text:
  - ➜ Send to In-Progress
  - ➜ Send to Done
  - ➜ Send to Backlog
  - ➜ Mark Canceled
  - ➜ Send to Archive

#### 3. Fix "Saved" Notification

- Issue: Title and content edits don't show "Saved" notification (but priority/tag edits do)
- Root cause: CSS animation only runs on initial element creation, not on HTMX innerHTML swap
- Fix: Change PATCH response to return `<span class="save-indicator">Saved ✓</span>` with `hx-swap="outerHTML"` to re-trigger animation

### Technical Implementation

**Files to modify:**

- `src/web/server.ts` - GET /tasks handler for filter logic, PATCH handler for save notification fix
- `src/web/templates.ts` - Modal layout refactor, priority badge sizing, action button icons

**Filter logic in server.ts:**

```typescript
// When project filter is active, clear status filter and show backlog+done
if (projectFilter) {
  tasks = [...file.backlog, ...file.done].filter(
    (t) => t.reserved.project === projectFilter
  );
}
// When status filter is active, clear project filter
```

**Project filter visibility in templates.ts:**

```typescript
// Return empty string (not empty div) when no projects exist
if (projects.length === 0) return "";
```

### Acceptance Criteria

- [ ] Project filter shows tasks from both Backlog and Done sections
- [ ] Clicking project filter clears any active status filter
- [ ] Clicking status filter clears any active project filter
- [ ] Project filter section (including label) is hidden when no projects exist
- [ ] Priority buttons in modal are smaller, matching tag badge size
- [ ] Priority, Project, Tags appear in one horizontal row that wraps on mobile
- [ ] Action buttons are right-aligned on the Status row
- [ ] Action buttons have unicode icons with verb text (e.g., "▶ Send to In-Progress")
- [ ] Editing task title shows "Saved ✓" notification
- [ ] Editing task content shows "Saved ✓" notification
- [ ] Editing priority still shows "Saved ✓" notification (regression)
- [ ] Editing tags still shows "Saved ✓" notification (regression)

***

task-log

- 2025-12-20T03:09:37Z | Moved to Done

## smb-12 Task list project badge should not navigate to project view

### Description

Clicking project badge in the task list should NOT go to project view. Clicking the row always opens the modal. Follow-up to smb-2.

***

task-log

- 2025-12-20T03:09:37Z | Moved to Done

## smb-11 Add copy-to-clipboard button for task ID in modal

[p3]

### Description

When viewing a task in the modal, there should be a small icon next to the task ID that, when clicked or tapped, copies the task ID to the clipboard.

***

task-log

- 2025-12-20T03:09:37Z | Moved to Done

## smb-10 Add project filter section to web UI

[p3][project:web][depends-on-smb-2]

#### Summary

Add a dedicated project filter section to the web UI, similar to priority/status filters.

#### Implementation Details

##### Files to Modify

- `src/web/templates.ts` - Add `renderProjectFilter()` function
- `src/web/server.ts` - Add `project` query parameter handling to `/tasks` endpoint
- `src/web/page.ts` - Add project filter section to the sidebar/header

##### Technical Approach

1. Create `renderProjectFilter()` function that displays all unique projects as filter buttons
2. Style filter buttons to match existing priority/status filters
3. Add `project` query parameter support to the server
4. Ensure project filter combines with other filters (AND logic)
5. Update URL to include `?project=xxx` when filtered

#### Acceptance Criteria

- [ ] Project filter section appears in sidebar/header
- [ ] All unique projects from tasks are shown as filter buttons
- [ ] Clicking a project filter shows only tasks with that project
- [ ] Project filter combines with priority/status/tag filters (AND logic)
- [ ] URL reflects active project filter
- [ ] "All Projects" or clear option to remove filter

***

task-log

- 2025-12-20T03:09:37Z | Moved to Done
- 2025-12-17T23:59:57Z | Priority changed from [p4] to [p3]
- 2025-12-17T23:59:48Z | Priority changed from [p2] to [p4]

## smb-24 Refactor web UI using html-template-tag

[p1][web][refactor][project:web][refined]

#### Overview

Refactor src/web/templates.ts and src/web/page.ts to use `html-template-tag` for automatic HTML escaping.

#### Technical Approach

1. Install `html-template-tag` with `bun add html-template-tag`
2. Replace manual `escapeHtml(value)` calls with auto-escaping `${value}`
3. Use `$${value}` for trusted HTML that should NOT be escaped (nested template results)
4. Migrate custom modal backdrop to native `<dialog>` element
5. Keep `escapeHtml()` function as utility for edge cases (mark with deprecation comment)

#### Key Patterns

- **User data**: `html\`<td>${task.title}</td>`` (auto-escaped)
- **Nested HTML**: `html\`<td>$${priorityBadge}</td>`` (double $ to skip escaping)
- **Static content**: CSS/JS blocks use `$${}` since they're static

#### Files to Modify

- src/web/templates.ts (789 lines)
- src/web/page.ts (767 lines)

#### Acceptance Criteria

- [ ] `html-template-tag` installed and imported in both files
- [ ] All `escapeHtml()` calls on user data replaced with auto-escaping
- [ ] HTML-returning helpers marked with `$${}` where consumed
- [ ] Custom modal replaced with native `<dialog>` element
- [ ] Modal open/close JS updated for `<dialog>` API
- [ ] `escapeHtml()` kept but marked with deprecation comment
- [ ] No double-escaping (visual inspection + manual testing)
- [ ] No XSS vulnerabilities (audit all `$${}` usages)
- [ ] All existing functionality works (manual smoke test)
- [ ] TypeScript compiles (`bun run typecheck`)
- [ ] Binary builds (`bun run build`)

#### Risks

- Double-escaping if `escapeHtml()` calls left behind
- XSS if `$${}` used incorrectly on user input
- Dialog element requires JS changes for open/close behavior

#### Reference

https://www.npmjs.com/package/html-template-tag

***

task-log

- 2025-12-18T09:58:42Z | Moved to Done
- 2025-12-17T23:54:13Z | Content updated
- 2025-12-17T23:11:50Z | Content updated
- 2025-12-17T23:11:50Z | Content updated

## smb-50 A task's task-log web show/hide behavior

[p1][project:web][bug]

in the web UI, the Content field should NOT show the `task-log` to the user.

in the web UI, a separate, hidden-by-default, read-only textarea that displays the `task-log` should exist below the Content field.

Logging nitpick: the logging logic should never log "Priority changed from [p1] to [p1]".

***

task-log

- 2025-12-18T00:13:41Z | Moved to Done
- 2025-12-18T00:09:28Z | Added tag [bug]
- 2025-12-18T00:09:19Z | Removed tag [web]
- 2025-12-18T00:09:14Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:10Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:09Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:09Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:08Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:06Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:09:03Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:58Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:57Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:56Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:55Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:54Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:44Z | Content updated
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:34Z | Priority changed from [p1] to [p1]
- 2025-12-18T00:08:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:32Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:31Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:29Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:19Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:06Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:04Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:08:02Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:48Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:37Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:35Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:34Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:33Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:28Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:27Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:26Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:25Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:24Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:23Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:22Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:21Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:09Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:07:08Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:58Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:52Z | Title updated
- 2025-12-18T00:06:50Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:49Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:44Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:40Z | Content updated
- 2025-12-18T00:06:02Z | Task created
- 2025-12-18T00:06:38Z | Content updated
- 2025-12-18T00:06:02Z | Task created

## smb-9 Update 'Send to...' action buttons

[p3][ui][project:web][canceled]

Replace all 'Send to...' action buttons with 'Move to...'.

***

task-log

- 2025-12-20T02:57:43Z | Marked as canceled

## smb-29 Emoji-fy all Icons and rename buttons

[p1][ui][web]

- The button that adds [done] tag is '✅ Mark Done'

- '+ Add Task' button becomes '➕ Add Task'

- 'Mark Canceled' button becomes '❌ Cancel'

- 'x Send to Archive' button becomes '✖️ Archive'

- If a task does not have [in-progress] or [done] tags,

  - The button to add [in-progress] tag is '➡️ Send to In-Progress'

- If a task has [done] tag,

  - The button to add [in-progress] and remove [done] is '⬅️ Back to In-Progress'

- If a task has [in-progress] tag,
  - The button to remove the [in-progress] tag is '⬅️ Back to Backlog'

***

task-log

- 2025-12-20T03:05:54Z | Moved to Done

## smb-31 Change Emoji to Unicode

[p1][ui]

from ➡️ to ⮕
from ⬅️ to ⬅
from ➕ to ＋
from ✅ to ✔
from ❌ to ✖

***

task-log

- 2025-12-20T03:06:30Z | Moved to Done

## smb-32 Change Colors of Priority badges & buttons

[p1][ui]

Values come from https://picocss.com/docs/colors.

```
  --simbl-p1-bg: var(--pico-color-red-400);
  --simbl-p1-bg-light: var(--pico-color-red-100);
  --simbl-p1-text: var(--pico-color-red-600);
```

- For P1
  - bg-light use orange-400 `var(--pico-color-orange-400)`
  - foreground use orange-800
- For P2
  - background use orange-300
  - foreground use orange-700
- For P3
  - background use orange-200
  - foreground use orange-600
- For P4
  - background use orange-100
  - foreground use orange-500
- For P5-P9
  - background use orange-50
  - foreground use orange-400

***

task-log

- 2025-12-20T03:06:43Z | Moved to Done

## smb-33 Bug: why does 'refined' tag not show up in the tag cloud?

[bug][p1]

Why does 'refined' tag not show up in the tag cloud even though there are tasks in the backlog that have it?

***

task-log

- 2025-12-20T03:06:58Z | Moved to Done

## smb-35 Add app icons & favicons

[p2][design]

Add supplied files in `icons` directory to give this app icons and favicons.

***

task-log

- 2025-12-20T03:07:21Z | Moved to Done

```
```

## smb-38 Update the web app title tag

[p1][web]

make the title tag, `<title>{config.name} - Simbl</title>`

***

task-log

- 2025-12-20T03:10:17Z | Moved to Done

## smb-44 Bug: missing icons

[p1][bug][web][ui]

both /apple-touch-icon.png and /favicon.ico are giving 404 in production build.

***

task-log

- 2025-12-20T03:10:22Z | Moved to Done

## smb-19 Update the /refine custom command in this repo

[p1][canceled]

Update the /refine custom command in this repo.

Look for evidence of a tag added by the user indicating that this task needs refinement. When asking clarifying questions to the user, ask if the tag in question should be removed when the refinement is complete.

***

task-log

- 2025-12-20T03:15:22Z | Marked as canceled

## smb-56 bug: init bug

[p1][canceled]

I just ran simbl init in '~/code/Juce/little-heater' and it claimed to have NOT found a CLAUDE.md file even though there is definitly one there. and it offered to create one with SIMBL addition. I didn't add the SIMBL addition.

update: canceling this. false alarm. i ran simbl init in the wrong directory.

***

task-log

- 2025-12-21T00:00:30Z | Marked as canceled
- 2025-12-21T00:00:28Z | Content updated
