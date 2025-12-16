# SIMBL Browser UI Implementation Plan

> **Historical Record**: Core implementation (Phases 1-7) was completed on December 6, 2025. The `simbl serve` command provides a fully functional HTMX-powered web UI with real-time updates. Phases 8-10 contain polish items, some of which remain for future refinement. This document should be treated as a historical record; future enhancements should be tracked separately.

## Overview

Add `simbl serve` command that launches a local web UI using Bun's HTTP server, HTMX for interactivity, and Pico CSS for styling.

## Tech Stack

| Component     | Choice             | Notes                           |
| ------------- | ------------------ | ------------------------------- |
| Server        | Bun.serve()        | Built-in, zero deps             |
| Interactivity | HTMX (CDN)         | Server-rendered HTML fragments  |
| Styling       | Pico CSS (CDN)     | Classless, semantic HTML        |
| Real-time     | WebSocket          | File watcher on tasks.md        |
| Templates     | TypeScript strings | Inline for binary compatibility |

## Architecture

```
simbl serve [--port <custom>] [--open]
│
│ Note: Port can be configured via `simbl init --port` or serve flag
│
├── GET /                     # Task list page (HTML)
├── GET /tasks                # Task list fragment (HTMX partial)
├── GET /task/:id             # Task detail modal (HTMX partial)
├── POST /task                # Create task
├── PATCH /task/:id           # Update task (title, content, tags)
├── POST /task/:id/done       # Mark done
├── POST /task/:id/archive    # Archive task
├── DELETE /task/:id          # Delete (archived only, with confirm)
├── GET /tags                 # Tag cloud fragment
├── GET /search?q=...         # Search results fragment
├── WS /ws                    # WebSocket for live updates
│
└── Static assets (inline)
    ├── Pico CSS (CDN)
    ├── HTMX (CDN)
    └── Minimal custom JS (debounce, modal handling)
```

## UI Components

### 1. Task List View (`/`)

```
┌─────────────────────────────────────────────────────────┐
│ SIMBL                                    [+ Add Task]   │
├─────────────────────────────────────────────────────────┤
│ Search: [_______________]                               │
│                                                         │
│ Tags: [p1] [p2] [design] [auth] [project:api]  [clear]  │
│                                                         │
│ Status: [backlog] [in-progress] [done]  [clear]        │
├─────────────────────────────────────────────────────────┤
│ ID       │ Title              │ Priority │ Status       │
│──────────┼────────────────────┼──────────┼──────────────│
│ task-1   │ Fix login bug      │ P1       │ backlog      │
│ task-2   │ Add dark mode      │ P2       │ in-progress  │
│ task-3   │ Update docs        │ P3       │ done         │
└─────────────────────────────────────────────────────────┘
  ↑ sortable columns            ↑ click row → modal
```

**Features:**

- Sortable columns: ID, Title, Priority, Status (click header to sort)
- Search box: filters by title + content (debounced)
- Tag cloud: click tag to filter, click again or "clear" to reset
- Status filter buttons: backlog, in-progress, done (click to filter by status)
- Click row → opens task detail modal

### 2. Task Detail Modal

```
┌─────────────────────────────────────────────────────────┐
│ task-1                                           [×]    │
├─────────────────────────────────────────────────────────┤
│ Title: [Fix login bug_____________] ← edit in place     │
│                                                         │
│ Tags: [p1] [project:auth] [+ add tag]                   │
│                                                         │
│ Status: backlog  [Mark Done] [Archive]                  │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│ Content:                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ### Description                                     │ │
│ │                                                     │ │
│ │ Users can't log in when...                          │ │ ← edit in place
│ │                                          [saving...] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Relations:                                              │
│   Parent: task-0 (click → navigate)                     │
│   Blocked by: task-5                                    │
│   Children: task-7, task-8                              │
└─────────────────────────────────────────────────────────┘
```

**Features:**

- Edit title in place (debounce 500ms, save on blur)
- Edit content in place (textarea, same debounce)
- Tag management: click [×] to remove, [+ add tag] to add
- Status actions: Mark Done, Archive
- Relations shown as clickable links

### 3. Archive View

Accessible via tab or toggle. Shows archived tasks with:

- Same table layout
- [Restore] and [Delete] actions
- Delete requires confirm dialog

## File Structure

```
src/
├── cli/commands/serve.ts      # Command definition + server setup
├── web/
│   ├── server.ts              # Bun.serve() router + WebSocket
│   ├── templates.ts           # HTML templates as template literals
│   ├── handlers/
│   │   ├── pages.ts           # Full page renders
│   │   ├── partials.ts        # HTMX fragment renders
│   │   └── api.ts             # POST/PATCH/DELETE handlers
│   ├── components.ts          # Reusable HTML component functions
│   └── watch.ts               # File watcher + WebSocket broadcast
```

## Implementation Phases

### Phase 1: Basic Server + Read-Only List ✓

- [x] Create `simbl serve` command
- [x] Support custom port from config.yaml (set via `simbl init --port`)
- [x] Support --port flag override
- [x] Set up Bun.serve() with basic routing
- [x] Render task list page with Pico CSS
- [x] Sortable table (ID, title, priority, status)
- [x] Include HTMX + Pico from CDN

### Phase 2: Search + Tag Cloud

- [ ] Search input with debounced HTMX request
- [ ] Tag cloud generation from all tasks
- [ ] Tag click → filter list
- [ ] Clear filter button

### Phase 3: Task Detail Modal

- [ ] Modal HTML structure
- [ ] HTMX: click row → fetch + show modal
- [ ] Display all task fields
- [ ] Relations as clickable links

### Phase 4: Edit Capabilities

- [ ] Inline title edit (contenteditable or input)
- [ ] Inline content edit (textarea)
- [ ] Translate a task's content markdown. Headings shift 2 levels. H3 -> H1 to display in the browser UI, H1 -> H3 when saving content. A H5 or H6 shifting down can simply be made bold. (**bold**)
- [ ] Debounce logic (500ms + save on blur)
- [ ] "Saving..." / "Saved" indicator
- [ ] PATCH endpoint implementation

### Phase 5: Task Actions ✓

- [x] Add task form/modal
- [x] Mark Done action
- [x] Archive action
- [x] Tag add/remove
- [x] Status filter buttons (backlog, in-progress, done)

### Phase 6: Archive View

- [ ] Toggle/tab for archive view
- [ ] Restore action
- [ ] Delete with confirmation dialog
- [ ] DELETE endpoint (archived only)

### Phase 7: Real-time Updates

- [ ] File watcher on tasks.md
- [ ] WebSocket server setup
- [ ] Broadcast changes to connected clients
- [ ] HTMX WebSocket extension for live updates

### Phase 8: Polish

- [ ] Loading states
- [ ] Error handling + display
- [ ] Keyboard shortcuts (Esc to close modal)
- [ ] Mobile responsiveness (Pico handles most)
- [ ] Don't display tags in the UI with their braces
- [ ] Make the task view/edit modal wider.
- [ ] Clicking a selected tag in the tag cloud deselects it. no need for a 'clear' button.
- [ ] 'Saved' notif is not visible
- [ ] task modal close button top-right is not visible.
- [ ] task modal content textarea needs to have larger font size
- [ ] Make tags badge color light gray
- [ ] task modal Title input field should have bold text.

### Phase 9: Extended Polish

- [ ] The 'Add Task' modal should be bigger and include a field to add tags as comma separated values. Also add a textarea field to enter content of the task.
- [ ] The reserved special tags should be hidden in the tag cloud.
  - `depends-on`, `child-of-`, `p1`, `p2`, `p3`,
- [ ] Make SIMBL, the search field, and `Add Task`
- [ ] The `Saved ✓` notification should dismiss after some time.
- [ ] Editing the tags should trigger a save and display `Saved ✓` briefly.
- [ ] Bugfix: when the content contains a markdown checklist item (`- [ ] This is a checklist item`), it shows up in the browwer frontsend like this, `- \[ ] This is a checklist item`. Then, it saves back into markdown with the added backslash.
- [ ] Edit task modal, hovering over the close 'X' makes it dissapear against white background.
- [ ] Make the relation list items all fit on one line. make the task title cutoff with ellipsis (...)
- [ ] make the task modal even wider.
- [ ] task modal needs ability to do full CRUD on the priority tag

### Phase 10: CSS improvements

- [ ] Add a section to declare Pico CSS variables (https://picocss.com/docs/css-variables)
  - --pico-font-family
  - --pico-font-size
  - --pico-border-radius
  - --pico-primary
  - --pico-primary-background
  - --pico-spacing
  - --pico-background-color
  - --pico-card-background-color
- [ ] give me a list of hardcoded border radius values that we can replace with --pico-border-radius
- [ ] give me a list of hardcoded spacing values that we can potentially replace with --pico-spacing

## HTMX Patterns

### Debounced Search

```html
<input
  type="search"
  name="q"
  hx-get="/search"
  hx-trigger="input changed delay:300ms, search"
  hx-target="#task-list"
  placeholder="Search tasks..."
/>
```

### Inline Edit with Debounce

```html
<input
  type="text"
  name="title"
  value="Fix login bug"
  hx-patch="/task/task-1"
  hx-trigger="input changed delay:500ms, blur"
  hx-indicator="#save-indicator"
/>
<span id="save-indicator" class="htmx-indicator">saving...</span>
```

### Modal Trigger

```html
<tr
  hx-get="/task/task-1"
  hx-target="#modal-container"
  hx-swap="innerHTML"
  style="cursor: pointer;"
></tr>
```

### WebSocket Live Update

```html
<div hx-ext="ws" ws-connect="/ws">
  <div id="task-list" hx-swap-oob="true">
    <!-- List content, replaced on WS message -->
  </div>
</div>
```

## API Response Patterns

All mutating endpoints return HTMX partials, not JSON:

```typescript
// PATCH /task/:id
// Returns updated row + optional OOB swaps

return new Response(
  `
  <tr id="task-${id}" hx-swap-oob="true">
    ${renderTaskRow(updatedTask)}
  </tr>
  <div id="save-status" hx-swap-oob="true">Saved</div>
`,
  { headers: { "Content-Type": "text/html" } }
);
```

## Design Decisions

1. **Network binding:** Bind to `0.0.0.0` (all interfaces) to allow access via Tailscale from mobile devices. No auth needed since Tailscale network is trusted.

2. **Port conflicts:** Warn if 3497 is in use, then auto-find next available port.

3. **Browser auto-open:** Add `--open` flag to launch browser automatically.

## Dependencies

None new. Uses:

- Bun built-in HTTP server
- Bun built-in file watcher
- CDN: Pico CSS, HTMX

## Success Criteria

- [ ] `simbl serve` launches server on :3497
- [ ] Can view all tasks in sortable table
- [ ] Can search by title/content
- [ ] Can filter by clicking tags
- [ ] Can view task details in modal
- [ ] Can edit title/content inline with autosave
- [ ] Can add new tasks
- [ ] Can mark done, archive, restore
- [ ] Can delete archived tasks (with confirm)
- [ ] Live updates when tasks.md changes externally
- [ ] Works in compiled binary
