# Backlog

## smb-23 Add production building for Windows and Linux

[needs-refinement][project:core][on-ice]

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

## smb-59 Define centralized log format and types

[p2][child-of-smb-55][logging]

### Description

##### Description

Define TypeScript types and interfaces for the new centralized log format.

##### Tasks

- Create LogEntry interface with taskId, timestamp, event, and optional metadata fields
- Define LogEvent enum/type for all event types (created, done, canceled, tag_added, tag_removed, priority_changed, title_updated, content_updated, etc.)
- Add JSDoc documentation for the log format
- Export from core/log.ts

##### Acceptance Criteria

- All event types from current system are mapped
- Type definitions support future extensibility
- Clear documentation of JSON schema

## smb-60 Add log file path and version to config

[p2][child-of-smb-55][logging]

### Description

##### Description

Extend config.ts to support the new centralized logging system.

##### Tasks

- Add logVersion field (default: 1 for old, 2 for new)
- Add logFilePath field (default: '.simbl/log.ndjson')
- Update SimblConfig type definition
- Update default config initialization
- Ensure backward compatibility

##### Acceptance Criteria

- Config type includes new fields
- Default values set correctly
- Existing configs still load without errors

## smb-68 Enhance log command with new capabilities

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Rewrite log.ts to read from centralized log file and add new features.

##### Tasks

- Replace parseTaskLog() with getTaskLog() from new API
- Add filtering options: --event, --since, --until
- Add format options: --json for machine-readable output
- Add --all flag to show logs for all tasks (not just one)
- Add stats summary: 'X events over Y days'
- Improve output formatting with color/grouping
- Update help text and examples

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl log <task-id>' shows task history
- 'simbl log --all' shows global activity
- Filtering and formatting work as documented
- Performance acceptable for large log files (stream if needed)

## smb-69 Update web server to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate web/server.ts from embedded logging to centralized log file for all web UI mutations.

##### Tasks

- Replace all appendLogEntry() calls with new approach
- Update WebSocket change detection to watch log.ndjson
- Ensure all web mutations (task create, update, done, etc.) are logged
- Test live reload still works after log file changes
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- All web UI actions write to log.ndjson
- Browser UI refreshes on log changes
- No log markers in tasks.md
- Performance acceptable (file watch not too heavy)

## smb-70 Update web templates to display centralized logs

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate web/templates.ts from parseTaskLog() to new getTaskLog() API.

##### Tasks

- Replace parseTaskLog() calls with getTaskLog()
- Update task detail modal to render log entries from new format
- Ensure proper formatting of timestamps and events
- Add any new event types to display logic
- Test log rendering in browser UI

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- Task detail modal shows complete history
- All event types display correctly
- Timestamps formatted properly
- UI matches or improves on old design

## smb-71 Integration testing for centralized logging

[p2][child-of-smb-55][depends-on-smb-68][logging]

### Description

##### Description

Test the complete logging system across CLI and web interfaces.

##### Tasks

- Test migration on sample project with existing logs
- Test all CLI commands write correct log entries
- Test web UI mutations write correct log entries
- Test 'simbl log' command with various filters
- Verify no log markers in tasks.md after operations
- Test concurrent writes (multiple commands)
- Test large log files (performance)
- Document any gotchas or limitations

##### Dependencies

- Requires all command updates (smb-63 through smb-69) completed
- Requires migration utility (smb-62) completed

##### Acceptance Criteria

- All commands properly log events
- No regression in functionality
- Migration works on real SIMBL projects
- Documentation updated with testing results

## smb-72 Update documentation for centralized logging

[p2][child-of-smb-55][depends-on-smb-71][logging]

### Description

##### Description

Document the new centralized logging system for users and contributors.

##### Tasks

- Update SPEC.md with new log format details
- Update CLAUDE.md with architecture changes
- Add migration guide to docs/ or README
- Document new 'simbl log' command options
- Add troubleshooting section for log issues
- Update CHANGELOG.md with this milestone
- Add example log.ndjson snippets

##### Dependencies

- Requires integration testing (smb-70) completed

##### Acceptance Criteria

- All public documentation reflects new system
- Migration path clearly explained
- New features documented with examples
- CHANGELOG updated

## smb-73 Create a one-shot command to set parent relationship

[p2][cli]

right now the only way to establish a parent relationship is

`simbl relate smb-56 --parent smb-55`

make is so this command support multiple children args.

perhaps its like this:

`simbl relate smb-55 --children smb-56 smb-57 smb-58 smb-63`

... so we can establish multiple children in one shot

## smb-74 Bug: JSON output contains invalid control characters

[p1][bug][cli][json]

### Description

##### Description

`simbl list --json` outputs JSON that cannot be parsed by external tools due to invalid/unescaped control characters in task content.

##### Error

```
json.decoder.JSONDecodeError: Invalid control character at: line 128 column 62943 (char 80321)
```

##### Reproduction

```bash
simbl list --project interactive-plugin-workflow --json | python3 -c 'import json,sys; json.load(sys.stdin)'
```

##### Root Cause (suspected)

Task content likely contains raw control characters (newlines, tabs, etc.) that are not being properly escaped when serialized to JSON. The `JSON.stringify()` should handle this, but something may be injecting raw characters.

##### Investigation Steps

1. Identify which task(s) contain the problematic characters
2. Find where in the content the control character exists (char 80321)
3. Trace the JSON serialization path in `src/cli/commands/list.ts`
4. Ensure all string content is properly escaped before JSON output

##### Acceptance Criteria

- [ ] `simbl list --json` output is valid JSON parseable by any JSON parser
- [ ] Control characters in task content are properly escaped
- [ ] Add test case for tasks with special characters

## smb-78 Sync test

## smb-79 Another sync test

***

task-log

- 2025-12-25T08:24:41Z | Task created

## smb-80 Debug test

## smb-82 Debug add test

[debug-tag]

## smb-83 Tag test

[mytag][anothertag]

***

task-log

- 2025-12-25T08:26:35Z | Added tag [anothertag]
- 2025-12-25T08:26:14Z | Added tag [mytag]
- 2025-12-25T08:26:14Z | Task created

# Done

## smb-67 Update update command to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate update.ts from embedded logging to centralized log file.

##### Tasks

- Replace appendOrBatchLogEntry() call to use new approach
- Support logging: title_updated, content_updated, content_appended events
- Handle batching logic for multiple updates
- Remove any task content manipulation for logs
- Capture old/new values in metadata
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl update' operations write to log.ndjson
- Batched updates still create single log entry where appropriate
- No log markers in tasks.md
- Metadata includes what changed

## smb-66 Update tag command to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate tag.ts from embedded logging to centralized log file.

##### Tasks

- Replace appendLogEntry() calls for tag operations
- Support logging: tag_added, tag_removed, priority_changed events
- Remove any task content manipulation for logs
- Ensure proper event metadata (which tag, old/new values)
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl tag' operations write to log.ndjson
- All tag change types properly logged
- No log markers in tasks.md

## smb-65 Update cancel command to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate cancel.ts from embedded logging to centralized log file.

##### Tasks

- Replace appendLogEntry() call to use new log file approach
- Remove any task content manipulation for logs
- Ensure 'canceled' event is logged with proper metadata
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl cancel' writes to log.ndjson
- No log markers in tasks.md
- Cancellation timestamp preserved

## smb-64 Update done command to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate done.ts from embedded logging to centralized log file.

##### Tasks

- Replace appendLogEntry() call to use new log file approach
- Remove any task content manipulation for logs
- Ensure 'done' event is logged with proper metadata
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl done' writes to log.ndjson
- No log markers in tasks.md
- Completion timestamp preserved

## smb-63 Update add command to use centralized logging

[p2][child-of-smb-55][depends-on-smb-61][logging]

### Description

##### Description

Migrate add.ts from embedded logging to centralized log file.

##### Tasks

- Replace appendLogEntry() call to use new log file approach
- Remove any task content manipulation for logs
- Ensure 'created' event is logged with proper metadata
- Update tests if any exist

##### Dependencies

- Requires smb-61 (log operations) completed

##### Acceptance Criteria

- 'simbl add' writes to log.ndjson
- No log markers in tasks.md
- Task creation timestamp preserved

## smb-81 Full flow test

[test-tag]

***

task-log

- 2025-12-25T08:25:04Z | Moved to Done
- 2025-12-25T08:25:04Z | Added tag [test-tag]
- 2025-12-25T08:25:04Z | Task created

## smb-77 Test complete flow

***

task-log

- 2025-12-25T08:24:22Z | Moved to Done
- 2025-12-25T08:24:22Z | Task created

## smb-76 Test log order

***

task-log

- 2025-12-25T08:23:54Z | Moved to Done
- 2025-12-25T08:23:54Z | Task created

## smb-75 Test centralized logging

***

task-log

- 2025-12-25T08:23:39Z | Moved to Done

## smb-62 Build migration utility for existing logs

[p1][child-of-smb-55][logging]

### Description

##### Description

Create migration function to extract embedded logs from tasks.md and convert to centralized format.

##### Tasks

- Detect if migration needed (check for '***\n\ntask-log\n' in any task content)
- Parse existing embedded logs from all tasks
- Convert to new LogEntry format with proper timestamps
- Write to log.ndjson file
- Strip log sections from tasks.md
- Update config.yaml with logVersion: 2
- Add migration command: 'simbl migrate-logs' for manual trigger
- Auto-migrate on first command with logVersion: 1

##### Acceptance Criteria

- No data loss during migration
- Preserves all timestamps and event history
- Tasks.md cleaned of log markers
- Idempotent (safe to run multiple times)
- Migration logged/reported to user

##### Implementation Progress

**Tests Written (TDD):**

- Created comprehensive test suite in `src/core/migrate.test.ts` (832 lines, 21 test cases)
- Tests cover both `needsMigration()` and `migrateTaskLogs()` functions
- Tests verify all acceptance criteria including data integrity, idempotency, and error handling
- Updated `SimblConfig` interface to include `logVersion?: number` field
- All tests fail as expected (TDD requirement met - tests written BEFORE implementation)

**Test Coverage:**

needsMigration() - 7 tests:

- Empty tasks.md
- Already migrated (logVersion: 2)
- Tasks with embedded logs (needs migration)
- Mixed scenarios (with/without logs)
- Edge cases (missing files)

migrateTaskLogs() - 12 tests:

- Single task migration
- Multiple tasks migration
- Content preservation
- Log format conversion
- Config updates (logVersion: 2)
- Idempotency verification
- Mixed tasks (some with logs, some without)
- Edge cases (empty sections, minimal tasks, formatting)
- Correct counts in result

MigrationResult type - 2 tests:

- Type structure validation
- Error handling

**Next Steps:**
Ready for implementation of `migrate.ts` module to make tests pass.

##### Implementation Notes

- Created `src/core/migrate.ts` with `needsMigration()` and `migrateTaskLogs()`
- Added `simbl migrate-logs` command with --json and --force flags
- Added `logVersion` field to config (set to 2 after migration)
- Successfully migrated 1199 log entries from 57 tasks in this project
- Used TDD: 21 tests written first, then implementation

***

task-log

- 2025-12-25T08:02:20Z | Moved to Done
- 2025-12-25T08:02:15Z | Content updated

## smb-61 Implement centralized log file operations

[p1][child-of-smb-55][logging]

### Description

##### Description

Rewrite core/log.ts to use append-only NDJSON file instead of embedding in task content.

##### Tasks

- Implement appendLogToFile(entry: LogEntry) - append single NDJSON line
- Implement readLogFile(): LogEntry[] - parse entire log file
- Implement getTaskLog(taskId: string): LogEntry[] - filter logs for one task
- Remove old parseTaskLog() and stripTaskLog() functions
- Update appendLogEntry() to use new file-based approach
- Update appendOrBatchLogEntry() to use new file-based approach
- Handle missing log file gracefully (create on first write)

##### Acceptance Criteria

- Atomic append operations (use fs.appendFileSync or equivalent)
- Parse NDJSON correctly (one JSON object per line)
- No file rewrites for single appends
- Backward compatible with logVersion check

##### Implementation Notes

- Added `FileLogEntry` interface with taskId, timestamp, message
- Implemented `appendLogToFile()` using synchronous append for atomicity
- Implemented `readLogFile()` with graceful handling of malformed lines
- Implemented `getTaskLog()` with filtering and newest-first sorting
- Used TDD: wrote 18 tests first, then implemented to pass
- Log file path: `.simbl/log.ndjson`

## smb-57 Discovery: web URLs

[p2][web][project:discovery][refined]

How would we go about adding URL scheme to SIMBL web? how difficult would it be?

example:

http://localhost:3277/ -> shows the main list
http://localhost:3277/task-34 -> shows the main list with task-34 modal open
http://localhost:3277/new -> shows the main list with new task creation modal open

***

#### Discovery Findings

##### Current Architecture

**Server Routes (src/web/server.ts):**

- `GET /` - Main page (full HTML)
- `GET /tasks` - Task list partial (HTMX)
- `GET /task/:id` - Task modal partial (HTMX)
- `GET /add` - Add task form partial (HTMX)
- Various POST/PATCH/DELETE for mutations

**Client-Side (src/web/page.ts):**

- No client-side routing (SPA patterns)
- No history manipulation (pushState/popstate)
- Modals open via HTMX `hx-get` to `#modal-container`
- Keyboard shortcuts: `n` opens add modal, `Enter` opens task

##### Current Behavior

1. All pages serve from `/` only
2. Task modals load via HTMX into `#modal-container`
3. No URL change when opening/closing modals
4. Refreshing page always returns to base list view

***

#### Implementation Approach

##### Option A: Server-Side Rendering (Recommended)

**Approach:** Server renders full page with modal pre-opened based on URL path.

| URL | Server Behavior |
|-----|-----------------|
| `/` | Render page, no modal |
| `/<task-id>` | Render page + task modal HTML |
| `/new` | Render page + add form modal HTML |

**Pros:**

- Deep links work immediately (shareable)
- No JavaScript required for initial render
- SEO-friendly (if ever needed)
- Simple implementation

**Cons:**

- Requires server changes

**Changes Required:**

1. **server.ts**: Add route handlers for `/<task-id>` and `/new`
2. **page.ts**: Modify `renderPage()` to accept optional `openModal` parameter
3. **Client JS**: Add `history.pushState()` when opening modals, `popstate` listener

##### Option B: Client-Side Routing Only

**Approach:** Use hash routes (`/#/task-34`) or pushState with client-side handling.

**Pros:**

- Server remains unchanged

**Cons:**

- Initial page load shows flash (load page → parse URL → open modal)
- More complex client JS
- Hash routes less clean

***

#### Recommended Implementation

##### Phase 1: Server-Side Deep Links

```typescript
// server.ts - Add new routes

// GET /:taskId - Deep link to task modal
if (path.match(/^\/[a-z]+-\d+$/) && req.method === 'GET') {
  const taskId = path.slice(1);
  const file = loadTasks();
  const allTasks = getAllTasks(file);
  const task = allTasks.find(t => t.id === taskId);
  
  if (!task) {
    return new Response('Task not found', { status: 404 });
  }
  
  // Render full page with modal pre-opened
  return new Response(
    renderPage(file, config.name, { modal: 'task', taskId }),
    { headers: { 'Content-Type': 'text/html' } }
  );
}

// GET /new - Deep link to add task modal
if (path === '/new' && req.method === 'GET') {
  const file = loadTasks();
  return new Response(
    renderPage(file, config.name, { modal: 'add' }),
    { headers: { 'Content-Type': 'text/html' } }
  );
}
```

##### Phase 2: URL Sync (pushState)

```javascript
// page.ts - Add to client JS

// Update URL when opening task modal
document.body.addEventListener('htmx:afterSwap', function(evt) {
  if (evt.detail.target.id === 'modal-container') {
    const taskModal = document.querySelector('#modal-content[data-task-id]');
    if (taskModal) {
      const taskId = taskModal.getAttribute('data-task-id');
      history.pushState({ modal: 'task', taskId }, '', '/' + taskId);
    } else if (document.querySelector('#modal-content form[action="/task"]')) {
      history.pushState({ modal: 'add' }, '', '/new');
    }
  }
});

// Update URL when closing modal
const originalCloseModal = closeModal;
closeModal = function() {
  originalCloseModal();
  if (window.location.pathname !== '/') {
    history.pushState({}, '', '/');
  }
};

// Handle back/forward navigation
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.modal === 'task') {
    htmx.ajax('GET', '/task/' + e.state.taskId, {target: '#modal-container'});
  } else if (e.state && e.state.modal === 'add') {
    htmx.ajax('GET', '/add', {target: '#modal-container'});
  } else {
    closeModal();
  }
});
```

***

#### Effort Estimate

| Task | Effort |
|------|--------|
| Server route for `/<task-id>` | Low |
| Server route for `/new` | Low |
| Modify `renderPage()` for pre-opened modal | Medium |
| Client-side pushState/popstate | Medium |
| Testing edge cases | Low |
| **Total** | ~3-4 subtasks |

***

#### Edge Cases to Handle

1. **Invalid task ID in URL**: Return 404 page
2. **Task ID exists but task not found**: Show "task not found" modal
3. **Refresh while modal open**: Should reopen same modal
4. **Back button behavior**: Should close modal, not navigate away
5. **Forward after back**: Should reopen modal

***

#### Recommendation

**Proceed with server-side rendering approach (Option A).**

Difficulty: **Medium** (3-4 subtasks)

The implementation is straightforward because:

- Route matching is simple (regex for task ID format)
- `renderPage()` already generates modal HTML
- HTMX handles dynamic loading after initial render
- pushState integration is well-documented

**Next step:** Create implementation subtasks if desired.

## smb-55 Discovery: moving logging to a separate file

[p1][core][logging][refined][project:discovery]

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

## smb-58 add help command flag

[p1][cli]

adding `-h` or `--help` to a command should make simbl cli explain itself.

Does it make sense to have `simbl -h` and `simbl usage` show the same result?

##### Implementation Notes

Fixed in src/index.ts by adding detection for help/version flags (`-h`, `--help`, `--version`) before the TUI check. These flags now correctly route to citty's runMain() instead of launching the TUI.

Note: `-v` is not supported by citty as a short form of `--version` (shows help with error instead). Only `--version` works.

## smb-54 Disable GIthub Actions

[p1][cicd]

## smb-53 Confirmations should use PicoCSS Modal

[p1][web]

Clicking 'Archive' should use PicoCSS modal

Clicking 'Cancel' should use PicoCSS modal

https://picocss.com/docs/modal

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

## smb-52 Bug: Canceling a task in both CLI and Web should also move it to Done

[p1][bug]

## smb-51 Task IDs in Archive duplication prevention

[p1]

When a task is moved to archive, its task ID no longer appears in the Backlog or Done sections. Because of this, newly added tasks can be assigned a task ID that already exists in the archive which can lead to a collision of IDs.

When a new tasks is created, there should be a check on all IDs in BOTH files to ensure no duplicate IDs are created.

## smb-15 Add 'No Project' filter to web UI

[p2][feature][canceled][canceled]

### Description

The filter section above the table should have a button that only shows tasks that do not belong to a project.

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

## smb-40 Updates to CLAUDE.md snippet

[p1][claude.md]

update `const CLAUDE_MD_SECTION`:

1. give it knowledge of the file path location of `tasks.md`, `config.yaml`, `tasks-archive.md`
2. add an IMPORTANT instruction to always proactively update task descriptions when new information, surprises, course-corrections or architectural decisions are made. And, provide an example CLI command that does this.

## smb-41 the CLAUDE.md init update should mention task ID format

[p2][init]

if the config has a custom prefix, CLAUDE.md should inform accordingly, if no prefix specified in config, default 'task-' prefix should be mentioned.

## smb-42 inti wizard should ask if the user wants to specify a custom port

[p1][init]

## smb-43 Expand implementation of json output flag

[p1][cli][json]

For every CLI command that an agentic AI tool might run on SIMBL, there should be an option to have SIMBL respond with JSON.

##### Implementation Notes\nAdded --json flag to: done, cancel, update, relate, unrelate, tag add, tag remove

## smb-49 Test task for logging

[feature][p2]

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

## smb-46 Task log: markdown format and parser

[p2][project:core][child-of-smb-28]

### Description

##### Overview

Implement the core parsing layer for task log sections. This is the foundation for the task log feature.

##### Technical Requirements

###### Log Section Format

````markdown

## smb-18 Add auto-complete to new tag input field

[feature][p3][project:web]

Wherever there exists a tag input field, auto-complete functionality should exist where the auto-complete has knowledge of all existing tags in tasks.md as well as reserved special tags so its easier to add tags to a task w/o making mistakes.

## smb-17 Add priority selection UI to the 'Add Task' modal

[p1][feature][web][project:web]

Allow the user to specify which Priority tag to add to a task in the 'Add Task' modal.

This field is optional.

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

## smb-12 Task list project badge should not navigate to project view

### Description

Clicking project badge in the task list should NOT go to project view. Clicking the row always opens the modal. Follow-up to smb-2.

## smb-11 Add copy-to-clipboard button for task ID in modal

[p3]

### Description

When viewing a task in the modal, there should be a small icon next to the task ID that, when clicked or tapped, copies the task ID to the clipboard.

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

## smb-50 A task's task-log web show/hide behavior

[p1][project:web][bug]

in the web UI, the Content field should NOT show the `task-log` to the user.

in the web UI, a separate, hidden-by-default, read-only textarea that displays the `task-log` should exist below the Content field.

Logging nitpick: the logging logic should never log "Priority changed from [p1] to [p1]".

## smb-9 Update 'Send to...' action buttons

[p3][ui][project:web][canceled]

Replace all 'Send to...' action buttons with 'Move to...'.

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

## smb-31 Change Emoji to Unicode

[p1][ui]

from ➡️ to ⮕
from ⬅️ to ⬅
from ➕ to ＋
from ✅ to ✔
from ❌ to ✖

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

## smb-33 Bug: why does 'refined' tag not show up in the tag cloud?

[bug][p1]

Why does 'refined' tag not show up in the tag cloud even though there are tasks in the backlog that have it?

## smb-35 Add app icons & favicons

[p2][design]

Add supplied files in `icons` directory to give this app icons and favicons.

## smb-38 Update the web app title tag

[p1][web]

make the title tag, `<title>{config.name} - Simbl</title>`

## smb-44 Bug: missing icons

[p1][bug][web][ui]

both /apple-touch-icon.png and /favicon.ico are giving 404 in production build.

## smb-19 Update the /refine custom command in this repo

[p1][canceled]

Update the /refine custom command in this repo.

Look for evidence of a tag added by the user indicating that this task needs refinement. When asking clarifying questions to the user, ask if the tag in question should be removed when the refinement is complete.

## smb-56 bug: init bug

[p1][canceled]

I just ran simbl init in '~/code/Juce/little-heater' and it claimed to have NOT found a CLAUDE.md file even though there is definitly one there. and it offered to create one with SIMBL addition. I didn't add the SIMBL addition.

update: canceling this. false alarm. i ran simbl init in the wrong directory.
````
