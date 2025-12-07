import type { Task, SimblFile } from "../core/task.ts";
import { getAllTasks } from "../core/parser.ts";
import {
  BLACK,
  BLUE,
  GREEN,
  GREY_DARK,
  GREY_MEDIUM,
  ORANGE,
  RED,
  WHITE,
  YELLOW,
} from "./constants.ts";

/**
 * Pico CSS CDN URL
 */
const PICO_CSS =
  "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css";

/**
 * HTMX CDN URL
 */
const HTMX_JS = "https://unpkg.com/htmx.org@2.0.4";

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
 * Priority badge styling
 */
function getPriorityBadge(priority: number | undefined): string {
  if (!priority) return "";
  const colors: Record<number, string> = {
    1: RED,
    2: ORANGE,
    3: YELLOW,
    4: GREEN,
  };
  const color = colors[priority] || GREY_MEDIUM;
  return `<span style="background: ${color}; color: ${WHITE}; padding: 2px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em;">P${priority}</span>`;
}

/**
 * Status badge styling
 */
function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    backlog: GREY_MEDIUM,
    "in-progress": BLUE,
    done: GREEN,
    canceled: RED,
  };
  const color = colors[status] || GREY_MEDIUM;
  return `<span style="background: ${color}; color: ${WHITE}; padding: 2px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em;">${escapeHtml(
    status
  )}</span>`;
}

/**
 * Render a single task row
 */
export function renderTaskRow(task: Task): string {
  return `
    <tr hx-get="/task/${escapeHtml(task.id)}"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="cursor: pointer;">
      <td><code>${escapeHtml(task.id)}</code></td>
      <td>${escapeHtml(task.title)}</td>
      <td>${getPriorityBadge(task.reserved.priority)}</td>
      <td>${getStatusBadge(task.status)}</td>
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
        style="${backlogStyle} padding: 8px 16px; border-radius: var(--pico-border-radius); border: none; cursor: pointer; font-weight: bold;"
      >Backlog</button>
      <button
        hx-get="/tasks?view=done"
        hx-target="#tasks-container"
        hx-swap="innerHTML"
        style="${doneStyle} padding: 8px 16px; border-radius: var(--pico-border-radius); border: none; cursor: pointer; font-weight: bold;"
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
            Title${arrow("title")}
          </th>
          <th hx-get="${buildSortUrl("priority")}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            Priority${arrow("priority")}
          </th>
          <th hx-get="${buildSortUrl("status")}"
              hx-target="#tasks-container"
              hx-swap="innerHTML"
              style="cursor: pointer;">
            Status${arrow("status")}
          </th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(renderTaskRow).join("")}
        ${
          sorted.length === 0
            ? '<tr><td colspan="4">No tasks found</td></tr>'
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
        : "background: #e9ecef; color: #495057;";
      // If active, clicking deselects (go to /tasks without tag filter)
      const targetUrl = isActive
        ? "/tasks"
        : `/tasks?tag=${encodeURIComponent(tag)}`;
      return `<button
      class="tag-btn"
      style="${style} padding: 4px 12px; border-radius: var(--pico-border-radius); border: none; margin: 2px; cursor: pointer; font-size: 0.85em;"
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
  const priorityButtons = [1, 2, 3, 4]
    .map((p) => {
      const isActive = currentPriority === p;
      const color = getPriorityColor(p);
      return `<button
      hx-post="/task/${escapeHtml(task.id)}/priority/${p}"
      hx-target="#modal-container"
      hx-swap="innerHTML"
      style="background: ${isActive ? color : "transparent"}; color: ${
        isActive ? "white" : color
      }; border: 2px solid ${color}; padding: 4px 10px; border-radius: var(--pico-border-radius); font-weight: bold; cursor: pointer; margin-right: 4px;"
      title="${isActive ? "Current priority" : `Set to P${p}`}"
    >P${p}</button>`;
    })
    .join("");
  const clearPriorityBtn = currentPriority
    ? `<button
        hx-delete="/task/${escapeHtml(task.id)}/priority"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="background: transparent; color: #6c757d; border: 1px solid #6c757d; padding: 4px 8px; border-radius: var(--pico-border-radius); font-size: 0.8em; cursor: pointer;"
        title="Remove priority"
      >&times;</button>`
    : "";
  const priorityHtml = `<div style="display: flex; align-items: center; gap: 4px;">${priorityButtons}${clearPriorityBtn}</div>`;

  // Status display
  const statusColor = getStatusColor(task.status);
  const statusHtml = `<span style="background: ${statusColor}; color: ${WHITE}; padding: 4px 12px; border-radius: var(--pico-border-radius);">${escapeHtml(
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
              style="display: inline-flex; gap: 4px; margin: 0;"
            >
              <input
                type="text"
                name="tag"
                placeholder="add tag"
                style="padding: 4px 8px; font-size: 0.85em; width: 80px; margin: 0;"
              >
              <button type="submit" style="padding: 4px 8px; font-size: 0.85em; margin: 0;">+</button>
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
 * Get priority color
 */
function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: RED,
    2: ORANGE,
    3: YELLOW,
    4: GREEN,
  };
  return colors[priority] || GREY_MEDIUM;
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    backlog: GREY_MEDIUM,
    "in-progress": BLUE,
    done: GREEN,
    canceled: RED,
  };
  return colors[status] || GREY_MEDIUM;
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

/**
 * Render the full page layout
 */
export function renderPage(file: SimblFile): string {
  const allTasks = getAllTasks(file);
  const backlogTasks = file.backlog;

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIMBL</title>
  <link rel="stylesheet" href="${PICO_CSS}">
  <script src="${HTMX_JS}"></script>
  <style>
    /* Pico CSS variable overrides */
    :root {
      --pico-font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --pico-font-size: 16px;
      --pico-border-radius: 0.375rem;
      --pico-primary: #3b82f6;
      --pico-primary-background: #3b82f6;
      --pico-spacing: 1rem;
      --pico-background-color: #ffffff;
      --pico-card-background-color: #f8fafc;
    }

    /* Loading indicator - default hidden */
    .htmx-indicator { display: none; }
    .htmx-request .htmx-indicator { display: inline; }
    .htmx-request.htmx-indicator { display: inline; }

    /* Save indicator - with auto-fade animation */
    .save-indicator {
      color: #28a745;
      font-size: 0.9em;
      font-weight: 500;
      animation: fadeOut 2s ease-in-out forwards;
      animation-delay: 1s;
    }
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    /* Relation links - single line with ellipsis */
    .relation-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      max-width: 100%;
      overflow: hidden;
    }
    .relation-link code {
      flex-shrink: 0;
    }
    .relation-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--pico-muted-color);
    }

    /* Loading state for buttons */
    .htmx-request button {
      opacity: 0.7;
      cursor: wait;
    }

    #modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    #modal-content {
      background: var(--pico-background-color);
      padding: calc(var(--pico-spacing) * 2);
      border-radius: var(--pico-border-radius);
      max-width: 1100px;
      width: 95%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    /* Modal close button */
    .modal-close-btn {
      background: #f0f0f0;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.75rem;
      line-height: 1;
      color: #666;
      border-radius: var(--pico-border-radius);
      transition: background 0.2s, color 0.2s;
    }
    .modal-close-btn:hover {
      background: #e0e0e0;
      color: #333;
    }

    /* Modal title input */
    .modal-title-input {
      font-size: 1.25rem;
      font-weight: 600;
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      padding: 0.25rem 0.5rem;
      border-radius: var(--pico-border-radius);
    }
    .modal-title-input:hover,
    .modal-title-input:focus {
      border-color: var(--pico-primary-border);
      background: var(--pico-background-color);
    }

    /* Content textarea */
    .content-textarea {
      width: 100%;
      min-height: 250px;
      font-family: monospace;
      font-size: 1rem;
      resize: vertical;
      line-height: 1.5;
    }

    /* Tag badges in modal */
    .tag-badge {
      background: ${WHITE};
      color: ${GREY_DARK};
      padding: 4px 8px;
      border-radius: var(--pico-border-radius);
      font-size: 0.85em;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    table tbody tr:hover {
      background: var(--pico-secondary-hover-background);
    }

    th[hx-get]:hover {
      text-decoration: underline;
    }

    /* Error toast */
    .error-toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: ${RED};
      color: ${WHITE};
      padding: 1rem 1.5rem;
      border-radius: var(--pico-border-radius);
      box-shadow: 0 4px 12px ${BLACK};
      z-index: 2000;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${WHITE};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
  </style>
</head>
<body>
  <main class="container">
    <header style="display: flex; justify-content: space-between; align-items: center;">
      <h1 style="margin: 0;">SIMBL</h1>
      <button
        hx-get="/add"
        hx-target="#modal-container"
        hx-swap="innerHTML"
        style="margin: 0;"
      >+ Add Task</button>
    </header>

    <section>
      <div style="margin-bottom: var(--pico-spacing);">
        <input
          type="search"
          id="search-input"
          name="q"
          placeholder="Search tasks..."
          hx-get="/tasks"
          hx-trigger="input changed delay:300ms, search"
          hx-target="#tasks-container"
          hx-swap="innerHTML"
          style="margin-bottom: 0.5rem;"
        >
      </div>

      <div style="margin-bottom: var(--pico-spacing);">
        <strong>Tags:</strong>
        ${renderTagCloud(allTasks)}
      </div>

      <div id="tasks-container">
        ${renderViewTabs("backlog")}
        ${renderTaskTable(backlogTasks)}
      </div>
    </section>

    <div id="modal-container"></div>
  </main>

  <script>
    // Close modal on backdrop click or Escape key
    document.addEventListener('click', function(e) {
      if (e.target.id === 'modal-backdrop') {
        document.getElementById('modal-container').innerHTML = '';
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('modal-container').innerHTML = '';
      }
    });

    // Error toast handling
    function showError(message) {
      const existingToast = document.querySelector('.error-toast');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'error-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(function() {
        toast.remove();
      }, 5000);
    }

    // HTMX error handling
    document.body.addEventListener('htmx:responseError', function(evt) {
      showError('Request failed: ' + evt.detail.xhr.statusText);
    });

    document.body.addEventListener('htmx:sendError', function() {
      showError('Network error - please check your connection');
    });

    // WebSocket connection for live updates
    (function() {
      let ws;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;
      const reconnectDelay = 1000;

      function connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + window.location.host + '/ws');

        ws.onopen = function() {
          console.log('SIMBL: Live updates connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = function(event) {
          // Process OOB swaps from server
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = event.data;

          // Find and process elements with hx-swap-oob="true"
          const oobElements = tempDiv.querySelectorAll('[hx-swap-oob="true"]');
          oobElements.forEach(function(el) {
            const targetId = el.id;
            if (targetId) {
              const target = document.getElementById(targetId);
              if (target) {
                target.innerHTML = el.innerHTML;
              }
            }
          });

          // Re-process HTMX on swapped content
          if (typeof htmx !== 'undefined') {
            htmx.process(document.body);
          }
        };

        ws.onclose = function() {
          console.log('SIMBL: Live updates disconnected');
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log('SIMBL: Reconnecting in ' + reconnectDelay + 'ms (attempt ' + reconnectAttempts + ')');
            setTimeout(connect, reconnectDelay);
          }
        };

        ws.onerror = function(error) {
          console.error('SIMBL: WebSocket error', error);
        };
      }

      connect();
    })();
  </script>
</body>
</html>`;
}
