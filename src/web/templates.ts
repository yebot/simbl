import type { Task } from "../core/task.ts";

/**
 * Pico CSS CDN URLs
 */
export const PICO_CSS =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css";
export const PICO_COLORS_CSS =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.colors.min.css";

/**
 * HTMX CDN URL
 */
export const HTMX_JS = "https://unpkg.com/htmx.org@2.0.4";

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Shift markdown heading levels for display (H3 -> H1, H4 -> H2, etc.)
 * Task content uses H3+ internally, but we display as H1+ in the UI
 */
export function shiftHeadingsForDisplay(content: string): string {
  return content.replace(/^(#{3,6})\s/gm, (match, hashes) => {
    const level = hashes.length;
    // H3 -> H1, H4 -> H2, H5 -> H3, H6 -> H4
    const newLevel = level - 2;
    if (newLevel < 1) return match; // Safety check
    return "#".repeat(newLevel) + " ";
  });
}

/**
 * Shift markdown heading levels for storage (H1 -> H3, H2 -> H4, etc.)
 * When saving, we shift back so H1 in UI becomes H3 in file
 * H5/H6 would become H7/H8 which don't exist, so convert to bold
 */
export function shiftHeadingsForStorage(content: string): string {
  return content.replace(/^(#{1,6})\s(.*)$/gm, (_match, hashes, text) => {
    const level = hashes.length;
    const newLevel = level + 2;
    if (newLevel > 6) {
      // H5+ in UI would become H7+, convert to bold text
      return `**${text}**`;
    }
    return "#".repeat(newLevel) + " " + text;
  });
}

/**
 * Priority color scheme - single source of truth
 * Returns Pico CSS color name (e.g., "red", "yellow", "azure")
 */
function getPriorityColorName(priority: number): string {
  const colors: Record<number, string> = {
    1: "red",
    2: "yellow",
    3: "azure",
  };
  return colors[priority] || "azure";
}

/**
 * Priority badge styling using Pico CSS color variables
 */
function getPriorityBadge(priority: number | undefined): string {
  if (!priority) return "";
  const color = getPriorityColorName(priority);
  return `<span class="priority-badge" style="background: var(--pico-color-${color}-50); color: var(--pico-color-${color}-500);">P${priority}</span>`;
}

/**
 * Status badge styling using Pico CSS color variables
 */
function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    backlog: "var(--pico-color-zinc-400)",
    "in-progress": "var(--pico-color-azure-400)",
    done: "var(--pico-color-green-550)",
    canceled: "var(--pico-color-red-550)",
  };
  const color = colors[status] || "var(--pico-color-slate-500)";
  return `<span style="background: ${color}; color: var(--pico-color-slate-50); padding: 2px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em;">${escapeHtml(
    status
  )}</span>`;
}

/**
 * Render a single task row
 */
export function renderTaskRow(task: Task): string {
  const priorityBadge = getPriorityBadge(task.reserved.priority);
  const statusBadge = getStatusBadge(task.status);
  const badges = [priorityBadge, statusBadge].filter(Boolean).join(" ");

  return `
    <tr hx-get="/task/${escapeHtml(task.id)}"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="cursor: pointer;">
      <td><code>${escapeHtml(task.id)}</code></td>
      <td>${escapeHtml(task.title)}${badges ? " " + badges : ""}</td>
    </tr>
  `;
}

/**
 * Render the view tabs (Backlog / Done)
 */
export function renderViewTabs(
  activeView: "backlog" | "done" = "backlog"
): string {
  const backlogStyle =
    activeView === "backlog"
      ? "background: var(--pico-primary-background); color: var(--pico-primary-inverse);"
      : "background: var(--pico-secondary-background); color: var(--pico-color);";
  const doneStyle =
    activeView === "done"
      ? "background: var(--pico-primary-background); color: var(--pico-primary-inverse);"
      : "background: var(--pico-secondary-background); color: var(--pico-color);";

  return `
    <div id="view-tabs" style="margin-bottom: var(--pico-spacing); display: flex; gap: calc(var(--pico-spacing) / 2);">
      <button
        hx-get="/tasks?view=backlog"
        hx-target="#tasks-container"
        hx-swap="innerHTML"
        style="${backlogStyle}"
      >Backlog</button>
      <button
        hx-get="/tasks?view=done"
        hx-target="#tasks-container"
        hx-swap="innerHTML"
        style="${doneStyle}"
      >Done</button>
    </div>
  `;
}

/**
 * Render the task list table
 */
export function renderTaskTable(
  tasks: Task[],
  sortBy: string = "id",
  sortDir: "asc" | "desc" = "asc",
  searchQuery?: string,
  tagFilter?: string,
  view: "backlog" | "done" = "backlog"
): string {
  // Sort tasks
  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "id":
        cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "priority":
        const pa = a.reserved.priority || 99;
        const pb = b.reserved.priority || 99;
        cmp = pa - pb;
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const nextDir = (col: string) =>
    sortBy === col && sortDir === "asc" ? "desc" : "asc";
  const arrow = (col: string) =>
    sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // Build query string preserving search, tag filters, and view
  const buildSortUrl = (col: string) => {
    const params = new URLSearchParams();
    params.set("sort", col);
    params.set("dir", nextDir(col));
    if (searchQuery) params.set("q", searchQuery);
    if (tagFilter) params.set("tag", tagFilter);
    if (view !== "backlog") params.set("view", view);
    return `/tasks?${params.toString()}`;
  };

  return `
    <table id="task-list">
      <thead>
        <tr>
          <th hx-get="${buildSortUrl("id")}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            ID${arrow("id")}
          </th>
          <th hx-get="${buildSortUrl("title")}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            Task${arrow("title")}
          </th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(renderTaskRow).join("")}
        ${
          sorted.length === 0
            ? '<tr><td colspan="2">No tasks found</td></tr>'
            : ""
        }
      </tbody>
    </table>
  `;
}

/**
 * Check if a tag is a reserved/special tag that should be hidden from tag cloud
 */
function isReservedTag(tag: string): boolean {
  // Priority tags: p1, p2, p3, etc.
  if (/^p[1-9]$/.test(tag)) return true;
  // Relation tags: depends-on-*, child-of-*
  if (tag.startsWith("depends-on-")) return true;
  if (tag.startsWith("child-of-")) return true;
  // Status tags
  if (tag === "in-progress" || tag === "canceled" || tag === "refined")
    return true;
  return false;
}

/**
 * Extract all unique tags from tasks (excluding reserved tags like priority)
 */
export function extractAllTags(tasks: Task[]): string[] {
  const tagSet = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      // Filter out reserved tags from tag cloud
      if (!isReservedTag(tag)) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Render the tag cloud
 */
export function renderTagCloud(tasks: Task[], activeTag?: string): string {
  const tags = extractAllTags(tasks);

  if (tags.length === 0) {
    return "<p><em>No tags</em></p>";
  }

  const tagButtons = tags
    .map((tag) => {
      const isActive = activeTag === tag;
      const style = isActive
        ? "background: var(--pico-primary-background); color: var(--pico-primary-inverse);"
        : "background: var(--pico-color-grey-50); color: var(--pico-color-grey-700);";
      // If active, clicking deselects (go to /tasks without tag filter)
      const targetUrl = isActive
        ? "/tasks"
        : `/tasks?tag=${encodeURIComponent(tag)}`;
      return `<button
      class="tag-btn"
      style="${style}"
      hx-get="${targetUrl}"
      hx-target="#tasks-container"
      hx-swap="innerHTML"
      hx-include="#search-input"
    >${escapeHtml(tag)}</button>`;
    })
    .join("");

  return `<div id="tag-cloud">${tagButtons}</div>`;
}

/**
 * Render the task detail modal (editable version)
 */
export function renderTaskModal(
  task: Task,
  allTasks: Task[],
  showSaved = false
): string {
  const savedIndicator = showSaved ? "Saved ✓" : "";
  // Tags display (excluding priority which is shown separately)
  const displayTags = task.tags.filter((t) => !t.match(/^p[1-9]$/));

  // Priority display with CRUD
  const currentPriority = task.reserved.priority;

  // Default priorities: 1, 2, 3. Add higher priorities if they exist in backlog.
  const existingPriorities = new Set(
    allTasks
      .map((t) => t.reserved.priority)
      .filter((p): p is number => p !== undefined)
  );
  const priorities = [1, 2, 3];
  for (let p = 4; p <= 9; p++) {
    if (existingPriorities.has(p)) priorities.push(p);
  }

  const priorityButtons = priorities
    .map((p) => {
      const isActive = currentPriority === p;
      const colorName = getPriorityColorName(p);
      const bgColor = isActive
        ? `var(--pico-color-${colorName}-500)`
        : `var(--pico-color-${colorName}-50)`;
      const textColor = isActive
        ? `var(--pico-color-${colorName}-50)`
        : `var(--pico-color-${colorName}-500)`;
      return `<button
      hx-post="/task/${escapeHtml(task.id)}/priority/${p}"
      hx-target="#modal-container"
      hx-swap="innerHTML"
      style="background: ${bgColor}; color: ${textColor}; border: 0; padding: 4px 10px; border-radius: var(--pico-border-radius); font-weight: bold; cursor: pointer; margin-right: 4px;"
      title="${isActive ? "Current priority" : `Set to P${p}`}"
    >P${p}</button>`;
    })
    .join("");
  const clearPriorityBtn = currentPriority
    ? `<button
        hx-delete="/task/${escapeHtml(task.id)}/priority"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="background: transparent; color: #6c757d; border: 0px solid #6c757d; padding: 4px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em; cursor: pointer;"
        title="Remove priority"
      >&times;</button>`
    : "";
  const priorityHtml = `<div style="display: flex; align-items: center; gap: 4px;">${priorityButtons}${clearPriorityBtn}</div>`;

  // Status display
  const statusColor = getStatusColor(task.status);
  const statusHtml = `<span style="background: ${statusColor}; color: var(--pico-color-slate-50); padding: 4px 12px; border-radius: var(--pico-border-radius);">${escapeHtml(
    task.status
  )}</span>`;

  // Relations section
  const relationsHtml: string[] = [];

  // Parent
  if (task.reserved.parentId) {
    const parentTask = allTasks.find((t) => t.id === task.reserved.parentId);
    const parentTitle = parentTask ? escapeHtml(parentTask.title) : "";
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Parent:</strong>
        <a href="#" class="relation-link" hx-get="/task/${escapeHtml(
          task.reserved.parentId
        )}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;">
          <code>${escapeHtml(
            task.reserved.parentId
          )}</code><span class="relation-title">${parentTitle}</span>
        </a>
      </div>
    `);
  }

  // Dependencies
  if (task.reserved.dependsOn.length > 0) {
    const deps = task.reserved.dependsOn
      .map((depId) => {
        const depTask = allTasks.find((t) => t.id === depId);
        const depTitle = depTask ? escapeHtml(depTask.title) : "";
        return `<a href="#" class="relation-link" hx-get="/task/${escapeHtml(
          depId
        )}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;"><code>${escapeHtml(
          depId
        )}</code><span class="relation-title">${depTitle}</span></a>`;
      })
      .join("");
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Blocked by:</strong>
        <div style="margin-left: var(--pico-spacing);">${deps}</div>
      </div>
    `);
  }

  // Children (find tasks that have this task as parent)
  const children = allTasks.filter((t) => t.reserved.parentId === task.id);
  if (children.length > 0) {
    const childLinks = children
      .map(
        (child) =>
          `<a href="#" class="relation-link" hx-get="/task/${escapeHtml(
            child.id
          )}" hx-target="#modal-container" hx-swap="innerHTML" style="text-decoration: none;"><code>${escapeHtml(
            child.id
          )}</code><span class="relation-title">${escapeHtml(
            child.title
          )}</span></a>`
      )
      .join("");
    relationsHtml.push(`
      <div style="margin-bottom: 0.5rem;">
        <strong>Children:</strong>
        <div style="margin-left: var(--pico-spacing);">${childLinks}</div>
      </div>
    `);
  }

  // Project
  const projectHtml = task.reserved.project
    ? `<span style="background: var(--pico-secondary-background); padding: 4px 10px; border-radius: var(--pico-border-radius);">${escapeHtml(
        task.reserved.project
      )}</span>`
    : "";

  // Shift heading levels for display (H3 -> H1, etc.)
  const displayContent = shiftHeadingsForDisplay(task.content);

  return `
    <div id="modal-backdrop">
      <article id="modal-content">
        <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--pico-spacing);">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h2 style="margin: 0;"><code>${escapeHtml(task.id)}</code></h2>
              <span id="save-indicator-${escapeHtml(
                task.id
              )}" class="save-indicator">${savedIndicator}</span>
            </div>
            <div style="margin-top: 0.5rem;">
              <input
                type="text"
                name="title"
                value="${escapeHtml(task.title)}"
                placeholder="Task title..."
                hx-patch="/task/${escapeHtml(task.id)}"
                hx-trigger="input changed delay:500ms, blur"
                hx-target="#save-indicator-${escapeHtml(task.id)}"
                hx-swap="innerHTML"
                class="modal-title-input"
              >
            </div>
          </div>
          <button
            onclick="document.getElementById('modal-container').innerHTML = ''"
            class="modal-close-btn"
            aria-label="Close modal"
          >&times;</button>
        </header>

        <div style="display: grid; grid-template-columns: auto 1fr; gap: calc(var(--pico-spacing) / 2) var(--pico-spacing); margin-bottom: var(--pico-spacing);">
          <strong>Status:</strong>
          <div style="display: flex; align-items: center; gap: calc(var(--pico-spacing) / 2);">
            ${statusHtml}
            ${
              task.section === "backlog"
                ? `<button
                   hx-post="/task/${escapeHtml(task.id)}/done"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="outline"
                   style="padding: 4px 12px; font-size: 0.8em;"
                 >Mark Done</button>`
                : `<button
                   hx-post="/task/${escapeHtml(task.id)}/backlog"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   class="outline secondary"
                   style="padding: 4px 12px; font-size: 0.8em;"
                 >Restore to Backlog</button>
                 <button
                   hx-delete="/task/${escapeHtml(task.id)}"
                   hx-target="#modal-container"
                   hx-swap="innerHTML"
                   hx-confirm="Are you sure you want to permanently delete this task?"
                   class="outline"
                   style="padding: 4px 12px; font-size: 0.8em; color: var(--pico-del-color); border-color: var(--pico-del-color);"
                 >Delete</button>`
            }
          </div>

          <strong>Priority:</strong>
          <div>${priorityHtml}</div>

          ${
            projectHtml
              ? `<strong>Project:</strong><div>${projectHtml}</div>`
              : ""
          }

          <strong>Tags:</strong>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
            ${
              displayTags.length > 0
                ? displayTags
                    .map(
                      (t) =>
                        `<span class="tag-badge">
                    ${escapeHtml(t)}
                    <button
                      hx-delete="/task/${escapeHtml(
                        task.id
                      )}/tag/${encodeURIComponent(t)}"
                      hx-target="#modal-container"
                      hx-swap="innerHTML"
                      style="background: none; border: none; padding: 0; cursor: pointer; font-size: 1em; line-height: 1; color: #6c757d;"
                      title="Remove tag"
                    >&times;</button>
                  </span>`
                    )
                    .join("")
                : '<em style="color: var(--pico-muted-color);">No tags</em>'
            }
            <form
              hx-post="/task/${escapeHtml(task.id)}/tag"
              hx-target="#modal-container"
              hx-swap="innerHTML"
              style="display: inline-flex; gap: .4rem; margin: 0;"
            >
              <input
                class="input-sm"
                type="text"
                name="tag"
                placeholder="add tag"
              >
              <button type="submit">+</button>
            </form>
          </div>
        </div>

        ${
          relationsHtml.length > 0
            ? `
          <hr style="margin: var(--pico-spacing) 0;">
          <h4 style="margin-bottom: 0.5rem;">Relations</h4>
          ${relationsHtml.join("")}
        `
            : ""
        }

        <hr style="margin: var(--pico-spacing) 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="margin: 0;">Content</h4>
          <span id="content-save-indicator-${escapeHtml(
            task.id
          )}" class="save-indicator"></span>
        </div>
        <textarea
          name="content"
          placeholder="Task content (markdown)..."
          hx-patch="/task/${escapeHtml(task.id)}"
          hx-trigger="input changed delay:500ms, blur"
          hx-target="#content-save-indicator-${escapeHtml(task.id)}"
          hx-swap="innerHTML"
          class="content-textarea"
        >${escapeHtml(displayContent)}</textarea>
      </article>
    </div>
  `;
}


/**
 * Get status color using Pico CSS color variables
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    backlog: "var(--pico-color-slate-500)",
    "in-progress": "var(--pico-color-azure-550)",
    done: "var(--pico-color-green-550)",
    canceled: "var(--pico-color-red-550)",
  };
  return colors[status] || "var(--pico-color-slate-500)";
}

/**
 * Render the add task form modal
 */
export function renderAddTaskForm(): string {
  return `
    <div id="modal-backdrop">
      <article id="modal-content" style="max-width: 700px;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--pico-spacing);">
          <h2 style="margin: 0;">Add Task</h2>
          <button
            onclick="document.getElementById('modal-container').innerHTML = ''"
            class="modal-close-btn"
            aria-label="Close modal"
          >&times;</button>
        </header>

        <form hx-post="/task" hx-target="#tasks-container" hx-swap="innerHTML">
          <label>
            Title <span style="color: var(--pico-del-color);">*</span>
            <input type="text" name="title" placeholder="Task title..." required autofocus>
          </label>
          <label>
            Tags <small style="color: var(--pico-muted-color);">(comma separated)</small>
            <input type="text" name="tags" placeholder="e.g. p2, feature, auth">
          </label>
          <label>
            Content <small style="color: var(--pico-muted-color);">(markdown)</small>
            <textarea name="content" placeholder="Task description, notes, acceptance criteria..." rows="6" style="font-family: monospace;"></textarea>
          </label>
          <div style="display: flex; gap: calc(var(--pico-spacing) / 2); justify-content: flex-end; margin-top: var(--pico-spacing);">
            <button type="button" class="secondary" onclick="document.getElementById('modal-container').innerHTML = ''">Cancel</button>
            <button type="submit">Create Task</button>
          </div>
        </form>
      </article>
    </div>
  `;
}
