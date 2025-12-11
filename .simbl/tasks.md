# Backlog

## smb-9 Update 'Send to...' action buttons

[p3][ui][project:web]

Replace all 'Send to...' action buttons with 'Move to...'.

## smb-13 Project CRUD operations in task modal

[project][project:web]

### Description

In the web UI's task edit modal, user should be able to:

- remove the task from a project
- add the task to an existing project (drop-down or autocomplete)
- add the task to a project that doesn't exist yet

## smb-17 Add priority selection UI to the 'Add Task' modal

[feature][web][p2][project:web]

Allow the user to specify which Priority tag to add to a task in the 'Add Task' modal.

This field is optional.

## smb-18 Add auto-complete to new tag input field

[feature][p3][project:web]

Wherever there exists a tag input field, auto-complete functionality should exist where the auto-complete has knowledge of all existing tags in tasks.md as well as reserved special tags so its easier to add tags to a task w/o making mistakes.

## smb-23 Add production building for Windows and Linux

[p3][needs-refinement]

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

## smb-25 Consolidate inline styles into CSS classes in web UI

[depends-on-smb-24]

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

[depends-on-smb-24]

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

## smb-5 CLI tag add should be graceful when tag already exists

[cli]

### Description

The CLI response when attempting to add an 'in-progress' tag to a task that already has it should not be an error, but a graceful informational reply that the tag is already there. Same for priority tags.

Currently returns exit code 1 with error message. Should return exit code 0 with informational message like:

- 'Task already has tag [in-progress]'
- 'Task already has priority [p2]'

## smb-27 Add 'Backlog' Status filter button

[p3][project:web]

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

## smb-28 Add Task Log Feature

[p2]

Add Task Log Feature

- Designate a section of task content were log entries can be stored
- "Hide" the log-entry section from the User facing web view 'Content (markdown)' field
- show/hide log toggle in task modal
- every time a task changes, a log entry is made
- for small changes, log entries less than 30 minutes old can be appended. (tag changes, small content edits, status moves.)

## smb-30 Update sorting for the HTMX table of tasks

[web][ui][p1][in-progress]

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

## smb-33 Bug: why does 'refined' tag not show up in the tag cloud?

[bug][p1]

Why does 'refined' tag not show up in the tag cloud even though there are tasks in the backlog that have it?

## smb-34 Improve *.bun-build file handling

[p1][bun]

Config Bun to NOT put *.bun-build files in the root

## smb-35 Add icons

[p2][design]

Add supplied files in `icons` directory to give this app icons and favicons.

## smb-36 Add GitHub workflow_dispatch for mobile task capture

[project:mobile-capture]

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

## smb-37 Add simbl sync command for pulling remote task changes

[depends-on-smb-36][project:mobile-capture]

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

# Done

## smb-38 Update the web app title tag

[p1][web]

make the title tag, `<title>{config.name} - Simbl</title>`

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

## smb-31 Change Emoji to Unicode

[p1][ui]

from ➡️ to ⮕
from ⬅️ to ⬅
from ➕ to ＋
from ✅ to ✔
from ❌ to ✖

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

## smb-21 Web UI Task modal: make entire Task ID clickable (to clipboard)

[web][p3][project:web][p5]

- remove the clipboard icon.
- make the entire "badge" clickable.
- inform user it was copied to clipboard.

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
```

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

## smb-4 Add keyboard shortcuts to web UI (n, p, w, /, j/k)

[p1][feature][web][refined]

#### Overview

Add keyboard shortcuts to the HTMX web UI for power-user productivity. Implementation should be in vanilla JS, added to the existing `<script>` block in `src/web/page.ts`.

#### Shortcuts to Implement

| Key             | Context                                  | Action                                                              |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `n`             | No modal open, no input focused          | Open Add Task modal                                                 |
| `p`             | No modal open, no input focused          | Cycle through priority filters (all existing priorities in backlog) |
| `w`             | Task detail modal open, no input focused | Toggle maximize/restore                                             |
| `/`             | No modal open                            | Focus search input                                                  |
| `j`/`k`         | No modal open, no input focused          | Navigate up/down through task list                                  |
| `Enter`/`Space` | Task selected via j/k, no input focused  | Open selected task's detail modal                                   |

#### Discoverability

Add a persistent footer hint bar at the bottom of the page showing common shortcuts:

```html
<footer class="keyboard-hints">
  <kbd>n</kbd> New task | <kbd>p</kbd> Priority | <kbd>/</kbd> Search |
  <kbd>j</kbd>/<kbd>k</kbd> Navigate
</footer>
```

Use PicoCSS's `<kbd>` styling. Keep it subtle and unobtrusive.

#### Technical Implementation

1. Add `keydown` event listener in `page.ts` (around line 390, near existing Escape handler)
2. Check for modifier keys (`ctrlKey`, `metaKey`, `altKey`) - skip if pressed
3. Check `document.activeElement` - skip if focused on `input`, `textarea`, `select`, or `[contenteditable]`
4. Detect modal state via `document.getElementById('modal-backdrop') !== null`
5. For 'p': Read current filter from DOM (check which priority button has active style), cycle to next
6. For 'w': Only apply to task detail modal (not add task modal) - check for `#task-modal` or similar identifier
7. For j/k navigation: Track selected row index in JS variable, add `.selected` class to highlight row
8. For Enter/Space: If a task row is selected, trigger click on that row (or use htmx.ajax to fetch modal)

#### Acceptance Criteria

##### Functional

- [ ] `n` opens Add Task modal when no modal open and no input focused
- [ ] `p` cycles through priority filters (none -> P1 -> P2 -> ... -> none) dynamically based on priorities in backlog
- [ ] `w` toggles maximize/restore on task detail modal only (not add task modal)
- [ ] `/` focuses the search input
- [ ] `j` moves selection down to next task row (wraps to top at end)
- [ ] `k` moves selection up to previous task row (wraps to bottom at start)
- [ ] Selected task row has visible highlight (e.g., background color or outline)
- [ ] `Enter` opens the selected task's detail modal
- [ ] `Space` opens the selected task's detail modal
- [ ] All shortcuts disabled when typing in any input/textarea

##### Accessibility

- [ ] Footer hint bar displays available shortcuts using `<kbd>` elements
- [ ] Shortcuts announced to screen readers via `aria-live` region
- [ ] Visual feedback when priority cycles (brief pulse animation)
- [ ] Selected row is visually distinct (sufficient contrast)

##### Technical

- [ ] No external JS libraries required
- [ ] Uses HTMX `htmx.ajax()` for triggering requests from JS
- [ ] Works in Chrome, Firefox, Safari
- [ ] Does not conflict with browser native shortcuts
- [ ] Selection state persists across HTMX partial page updates (or resets gracefully)

#### Notes

- Priority cycling reads existing priorities from the DOM dynamically
- The `w` shortcut only works on task detail modal because the add task modal is intentionally compact
- j/k selection index stored in JS variable; `.selected` CSS class applied to current row
- Enter/Space trigger the same action as clicking the task row

#### Follow up changes from HITL

- The 'p' command need to cycle through all existing priority levels in the project AND a "no selection" state.
  - A mouse click on a task should also trigger the vim-style selection.
- Also, I don't like 'j/k'. replace these keys with up and down arrow keys.

## smb-19 Update the /refine custom command in this repo

[p1]

Update the /refine custom command in this repo.

Look for evidence of a tag added by the user indicating that this task needs refinement. When asking clarifying questions to the user, ask if the tag in question should be removed when the refinement is complete.

## smb-11 Add copy-to-clipboard button for task ID in modal

[p3]

### Description

When viewing a task in the modal, there should be a small icon next to the task ID that, when clicked or tapped, copies the task ID to the clipboard.

## smb-12 Task list project badge should not navigate to project view

### Description

Clicking project badge in the task list should NOT go to project view. Clicking the row always opens the modal. Follow-up to smb-2.

## smb-10 Add project filter section to web UI

[p2][project:web][depends-on-smb-2]

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

## smb-2 Display project tags as dedicated badges in web UI

[p1][project][web][refined][p4]

#### Summary

Display `[project:xxx]` tags as dedicated violet/purple badges in task rows, separate from the tag cloud.

#### Implementation Details

##### Files to Modify

- `src/web/templates.ts` - Add project badge rendering, update `isReservedTag()`
- `src/web/page.ts` - Add CSS variables for project badge styling

##### Technical Approach

1. Ensure `isReservedTag()` includes `project:` prefix check (already done)
2. Add `--simbl-project-*` CSS variables using violet color family
3. Create `getProjectBadge()` helper function
4. Insert project badge in `renderTaskRow()` after priority and status badges
5. Ensure modal project display filters project tags from `displayTags`

##### Badge Styling

- Use violet/purple color family (distinct from priority/status/tags)
- Order: Priority → Status → Project → Tags
- Display just project name (e.g., `auth` not `project:auth`)
- Add ARIA label for accessibility

#### Acceptance Criteria

- [ ] Project tags are hidden from the tag cloud
- [ ] Project badge appears in task rows after priority/status badges
- [ ] Project badge uses violet color with CSS variables
- [ ] Badge displays just the project name (e.g., `auth`)
- [ ] Task modal hides project tags from Tags section (shown separately)
- [ ] Works correctly when task has no project (no empty badge)
- [ ] Works in both backlog and done views
- [ ] Clicking project badge filters list to that project

#### Notes

- Project filtering UI is a separate task
- Single project per task (current data model limitation)

## smb-7 Fix simbl serve port handling - not auto-finding available port

[p1][web][bug]

#### Problem

Race condition (TOCTOU - Time of Check to Time of Use) in port handling:

1. `isPortAvailable(port)` creates a temporary server, then **stops it** - releasing the port
2. `Bun.serve()` later attempts to bind, but port may be claimed by another process
3. No try-catch around final `Bun.serve()` call, so Bun's error propagates unhandled

#### Solution

Replace "check then bind" with atomic "bind with retry" pattern:

```typescript
async function startServerWithRetry(options: ServerOptions, maxAttempts = 100) {
  let port = options.port;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const server = Bun.serve({ port, ... });
      return { server, port };
    } catch (error) {
      if (isPortInUseError(error)) {
        port++;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}
```

#### Decisions Made

- **Port fallback**: Increment ports (try port+1, port+2, etc. up to 100 attempts)
- **Logging**: Silent retry - only announce final bound port

#### Implementation Notes

- Remove unused `isPortAvailable()` and `findAvailablePort()` functions
- Initialize file watcher AFTER successful server bind (avoid leaking watchers on retry)
- Extract server config to be reusable in retry loop
- Detect port-in-use via error message containing 'EADDRINUSE' or similar

#### Acceptance Criteria

- [ ] When default port 3497 is in use, server automatically binds to next available port
- [ ] When user-specified port is in use, server finds alternative and logs final port
- [ ] No race condition: port binding is atomic
- [ ] Server startup logs clearly show final bound port
- [ ] If no port available within 100 attempts, exit with clear error
- [ ] Remove unused isPortAvailable() and findAvailablePort() functions

## smb-3 Add a viewport maximization toggle button in the task edit modal

Add a viewport maximization toggle button to the task edit modal.

#### Implementation

**Approach:** CSS class toggle with vanilla JavaScript (no HTMX round-trip)

**Files to modify:**

- `src/web/page.ts` - Add CSS for `.maximized` state and transitions
- `src/web/templates.ts` - Add toggle button to `renderTaskModal()` header

**Button Design:**

- Placement: Left of the close button in modal header
- Icon: Unicode symbols (⛶ for expand, ✖ for restore - matches existing × close button)
- Styling: Match existing close button style

**CSS States:**

- Normal: `max-width: 1100px; width: 95%; max-height: 90vh`
- Maximized: `max-width: 98vw; width: 98vw; max-height: 98vh; height: 98vh; border-radius: 0`
- Transition: 200ms ease for smooth animation

**JavaScript:**

- Toggle `.maximized` class on `#modal-content`
- Update button icon and aria-pressed state
- No persistence needed (resets on modal close)

**Mobile:**

- Keep button visible on all screen sizes (consistent UI)

#### Acceptance Criteria

- [ ] Toggle button visible in modal header, left of close button
- [ ] Clicking expands modal to ~98% viewport
- [ ] Clicking again restores to default size
- [ ] Button icon updates to reflect state (expand ↔ restore)
- [ ] Smooth 200ms transition between states
- [ ] Content textarea grows proportionally when maximized
- [ ] Button has proper aria-label and aria-pressed attributes
- [ ] Escape key still closes modal in maximized state
- [ ] Works on all screen sizes (including mobile)

## smb-1 Init Claude.md preservation

[p1][init]

the `smbbl init` command, whether forced or not, should check to see if the user added any additional content to the '<!-- SIMBL:BEGIN --><!-- SIMBL:END -->' section and make an effort to preserve it.

## smb-22 Simbl plugin: update all commands that accept a task-id argument

[plugin][in-progress]

For any commands that expects a task ID (task-##) as its argument. If the user supplies only digits, (Ex. "9"), assume they want you to refer to "task-9" (or "abc-9" if the config task prefix is "abc")

## smb-6 Bug: simbl serve port handling not working - fails with 'port in use' error

[canceled]

## smb-15 Add 'No Project' filter to web UI

[p2][feature][canceled]

### Description

The filter section above the table should have a button that only shows tasks that do not belong to a project.
